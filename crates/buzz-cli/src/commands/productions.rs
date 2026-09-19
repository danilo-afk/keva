//! NIP-KP (keva): productions — film/series projects that group channels and
//! agents. One addressable event (kind 30180) per production, keyed by slug.

use crate::client::BuzzClient;
use crate::error::CliError;
use buzz_core::kind::{
    KIND_PRODUCTION, KIND_PRODUCTION_CHARACTER, KIND_PRODUCTION_DOCUMENT, KIND_PRODUCTION_EPISODE,
};
use uuid::Uuid;

fn parse_agent_spec(spec: &str) -> Result<(String, Option<String>), CliError> {
    let (pk, instr) = match spec.split_once('=') {
        Some((pk, instr)) => (pk.trim(), Some(instr.trim().to_string())),
        None => (spec.trim(), None),
    };
    if pk.len() != 64 || !pk.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(CliError::Usage(format!(
            "--agent expects <64-hex pubkey>[=instructions], got {spec:?}"
        )));
    }
    Ok((pk.to_ascii_lowercase(), instr.filter(|s| !s.is_empty())))
}

fn parse_channel(spec: &str) -> Result<Uuid, CliError> {
    Uuid::parse_str(spec.trim())
        .map_err(|e| CliError::Usage(format!("--channel must be a channel UUID: {e}")))
}

fn self_hex(client: &BuzzClient) -> String {
    client.keys().public_key().to_hex()
}

/// Productions are owner-authored: a human reads their own, an agent reads its
/// owner's (NIP-OA auth tag). Without this an agent sees no production at all.
fn production_owner_hex(client: &BuzzClient) -> String {
    client
        .auth_tag_owner_hex()
        .map(|o| o.to_ascii_lowercase())
        .unwrap_or_else(|| self_hex(client))
}

fn is_agent(client: &BuzzClient) -> bool {
    production_owner_hex(client) != self_hex(client)
}

async fn fetch(
    client: &BuzzClient,
    slug: Option<&str>,
) -> Result<Vec<serde_json::Value>, CliError> {
    let mut filter = serde_json::json!({
        "kinds": [KIND_PRODUCTION],
        "authors": [production_owner_hex(client)],
        "limit": 200,
    });
    if let Some(slug) = slug {
        filter["#d"] = serde_json::json!([slug]);
    }
    let raw = client.query(&filter).await?;
    let events: Vec<serde_json::Value> = serde_json::from_str(&raw)
        .map_err(|e| CliError::Other(format!("relay returned non-JSON: {e}")))?;
    Ok(events)
}

fn tag_values<'a>(ev: &'a serde_json::Value, name: &str) -> Vec<&'a [serde_json::Value]> {
    ev["tags"]
        .as_array()
        .map(|tags| {
            tags.iter()
                .filter_map(|t| t.as_array())
                .filter(|t| t.first().and_then(|v| v.as_str()) == Some(name))
                .map(|t| t.as_slice())
                .collect()
        })
        .unwrap_or_default()
}

fn summarize(ev: &serde_json::Value) -> serde_json::Value {
    let content: serde_json::Value =
        serde_json::from_str(ev["content"].as_str().unwrap_or("{}")).unwrap_or_default();
    let slug = tag_values(ev, "d")
        .first()
        .and_then(|t| t.get(1))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let channels: Vec<String> = tag_values(ev, "c")
        .iter()
        .filter_map(|t| t.get(1).and_then(|v| v.as_str()))
        .map(str::to_string)
        .collect();
    let agents: Vec<serde_json::Value> = tag_values(ev, "agent")
        .iter()
        .map(|t| {
            serde_json::json!({
                "pubkey": t.get(1).and_then(|v| v.as_str()).unwrap_or(""),
                "instructions": t.get(2).and_then(|v| v.as_str()),
            })
        })
        .collect();
    serde_json::json!({
        "slug": slug,
        "event_id": ev["id"],
        "created_at": ev["created_at"],
        "production": content,
        "channels": channels,
        "agents": agents,
    })
}

#[allow(clippy::too_many_arguments)]
pub async fn dispatch(cmd: crate::ProductionsCmd, client: &BuzzClient) -> Result<(), CliError> {
    match cmd {
        crate::ProductionsCmd::List => {
            let events = fetch(client, None).await?;
            let mut list: Vec<serde_json::Value> = events
                .iter()
                .map(summarize)
                .filter(|p| p["production"]["deleted"].as_bool() != Some(true))
                .collect();
            list.sort_by(|a, b| a["slug"].as_str().cmp(&b["slug"].as_str()));
            println!("{}", serde_json::to_string(&list).unwrap_or_default());
            Ok(())
        }
        crate::ProductionsCmd::Get { slug } => {
            let events = fetch(client, Some(&slug)).await?;
            let newest = events
                .iter()
                .max_by_key(|e| e["created_at"].as_i64().unwrap_or(0))
                .ok_or_else(|| CliError::Other(format!("production {slug:?} not found")))?;
            println!(
                "{}",
                serde_json::to_string(&summarize(newest)).unwrap_or_default()
            );
            Ok(())
        }
        crate::ProductionsCmd::Create {
            slug,
            name,
            format,
            aspect,
            status,
            premise,
            context_file,
            channel,
            agent,
            replace,
        } => {
            // An agent-signed production would be invisible to the owner's app.
            if is_agent(client) {
                return Err(CliError::Usage(
                    "productions are created by their owner in the app (Productions → New); \
                     nothing was written. Once it exists, write its documents, episodes and \
                     characters with `docs|episodes|characters set`."
                        .into(),
                ));
            }
            let existing = fetch(client, Some(&slug)).await?;
            let existing = existing
                .iter()
                .max_by_key(|e| e["created_at"].as_i64().unwrap_or(0))
                .cloned();
            if existing.is_some() && !replace {
                return Err(CliError::Usage(format!(
                    "production {slug:?} already exists; pass --replace to publish a new version"
                )));
            }
            // Start from the previous body so partial edits keep the rest.
            let mut body: serde_json::Value = existing
                .as_ref()
                .and_then(|e| serde_json::from_str(e["content"].as_str().unwrap_or("{}")).ok())
                .unwrap_or_else(|| serde_json::json!({}));
            if !body.is_object() {
                body = serde_json::json!({});
            }
            if let Some(v) = name {
                body["name"] = serde_json::json!(v);
            }
            if let Some(v) = format {
                body["format"] = serde_json::json!(v);
            }
            if let Some(v) = aspect {
                body["aspect"] = serde_json::json!(v);
            }
            if let Some(v) = status {
                body["status"] = serde_json::json!(v);
            }
            if let Some(path) = context_file {
                let text = std::fs::read_to_string(&path)
                    .map_err(|e| CliError::Usage(format!("cannot read {path}: {e}")))?;
                let ctx: serde_json::Value = serde_json::from_str(&text)
                    .map_err(|e| CliError::Usage(format!("{path} must be a JSON object: {e}")))?;
                if !ctx.is_object() {
                    return Err(CliError::Usage(format!("{path} must be a JSON object")));
                }
                body["context"] = ctx;
            }
            if let Some(p) = premise {
                if !body["context"].is_object() {
                    body["context"] = serde_json::json!({});
                }
                body["context"]["premise"] = serde_json::json!(p);
            }
            if body.get("name").and_then(|v| v.as_str()).is_none() {
                body["name"] = serde_json::json!(slug);
            }
            // Channels/agents: explicit flags replace the previous set; none given keeps it.
            let channels: Vec<Uuid> = if channel.is_empty() {
                existing
                    .as_ref()
                    .map(|e| {
                        tag_values(e, "c")
                            .iter()
                            .filter_map(|t| t.get(1).and_then(|v| v.as_str()))
                            .filter_map(|s| Uuid::parse_str(s).ok())
                            .collect()
                    })
                    .unwrap_or_default()
            } else {
                channel
                    .iter()
                    .map(|c| parse_channel(c))
                    .collect::<Result<_, _>>()?
            };
            let agents: Vec<(String, Option<String>)> = if agent.is_empty() {
                existing
                    .as_ref()
                    .map(|e| {
                        tag_values(e, "agent")
                            .iter()
                            .filter_map(|t| {
                                Some((
                                    t.get(1)?.as_str()?.to_string(),
                                    t.get(2).and_then(|v| v.as_str()).map(str::to_string),
                                ))
                            })
                            .collect()
                    })
                    .unwrap_or_default()
            } else {
                agent
                    .iter()
                    .map(|a| parse_agent_spec(a))
                    .collect::<Result<_, _>>()?
            };
            let content = serde_json::to_string(&body).unwrap_or_default();
            let builder = buzz_sdk::build_production(&slug, &content, &channels, &agents)
                .map_err(|e| CliError::Usage(e.to_string()))?;
            let event = builder
                .sign_with_keys(client.keys())
                .map_err(|e| CliError::Other(format!("sign failed: {e}")))?;
            let resp = client.submit_event(event.clone()).await?;
            println!(
                "{}",
                serde_json::json!({
                    "slug": slug,
                    "event_id": event.id.to_hex(),
                    "channels": channels.iter().map(|c| c.to_string()).collect::<Vec<_>>(),
                    "agents": agents.len(),
                    "relay": resp,
                })
            );
            Ok(())
        }
        crate::ProductionsCmd::Docs(sub) => {
            entity_dispatch(KIND_PRODUCTION_DOCUMENT, "doc", sub, client).await
        }
        crate::ProductionsCmd::Episodes(sub) => {
            entity_dispatch(KIND_PRODUCTION_EPISODE, "ep", sub, client).await
        }
        crate::ProductionsCmd::Characters(sub) => {
            entity_dispatch(KIND_PRODUCTION_CHARACTER, "char", sub, client).await
        }
    }
}

fn entity_id_ok(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 64
        && id
            .chars()
            .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-' || c == '_')
}

fn entity_summary(ev: &serde_json::Value) -> serde_json::Value {
    let d = tag_values(ev, "d")
        .first()
        .and_then(|t| t.get(1))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let id = d.rsplit('/').next().unwrap_or("").to_string();
    let content: serde_json::Value =
        serde_json::from_str(ev["content"].as_str().unwrap_or("{}")).unwrap_or_default();
    serde_json::json!({
        "id": id,
        "d": d,
        "event_id": ev["id"],
        "created_at": ev["created_at"],
        "content": content,
    })
}

/// Who may author a production's entities: its owner plus the agents the
/// owner listed on it. Entities from anyone else are ignored on read, and a
/// write from outside this set is refused because no reader would show it.
async fn trusted_authors(client: &BuzzClient, slug: &str) -> Result<Vec<String>, CliError> {
    let productions = fetch(client, Some(slug)).await?;
    let Some(production) = productions
        .iter()
        .max_by_key(|e| e["created_at"].as_i64().unwrap_or(0))
    else {
        if is_agent(client) {
            return Err(CliError::Other(format!(
                "production {slug:?} not found for your owner; nothing was read or written"
            )));
        }
        return Ok(vec![self_hex(client)]);
    };
    Ok(team_authors(production))
}

/// The production's author followed by its `agent` tags, lowercased, deduped.
fn team_authors(production: &serde_json::Value) -> Vec<String> {
    let mut authors = vec![production["pubkey"]
        .as_str()
        .unwrap_or("")
        .to_ascii_lowercase()];
    for t in tag_values(production, "agent") {
        if let Some(pk) = t.get(1).and_then(|v| v.as_str()) {
            let pk = pk.to_ascii_lowercase();
            if !authors.contains(&pk) {
                authors.push(pk);
            }
        }
    }
    authors
}

fn d_of(ev: &serde_json::Value) -> &str {
    tag_values(ev, "d")
        .first()
        .and_then(|t| t.get(1))
        .and_then(|v| v.as_str())
        .unwrap_or("")
}

/// Newest event per `d` across authors; ties go to the lowest id so every
/// reader picks the same head.
fn newest_by_d(events: Vec<serde_json::Value>) -> Vec<serde_json::Value> {
    let mut heads: std::collections::BTreeMap<String, serde_json::Value> = Default::default();
    for ev in events {
        let key = d_of(&ev).to_string();
        let newer = heads.get(&key).is_none_or(|cur| {
            let (a, b) = (
                ev["created_at"].as_i64().unwrap_or(0),
                cur["created_at"].as_i64().unwrap_or(0),
            );
            a > b || (a == b && ev["id"].as_str() < cur["id"].as_str())
        });
        if newer {
            heads.insert(key, ev);
        }
    }
    heads.into_values().collect()
}

async fn entity_fetch(
    client: &BuzzClient,
    kind: u32,
    prefix: &str,
    slug: &str,
    id: Option<&str>,
    authors: &[String],
) -> Result<Vec<serde_json::Value>, CliError> {
    let mut filter = serde_json::json!({
        "kinds": [kind],
        "authors": authors,
        "limit": 500,
    });
    if let Some(id) = id {
        filter["#d"] = serde_json::json!([format!("{slug}/{prefix}/{id}")]);
    }
    let raw = client.query(&filter).await?;
    let events: Vec<serde_json::Value> = serde_json::from_str(&raw)
        .map_err(|e| CliError::Other(format!("relay returned non-JSON: {e}")))?;
    let wanted = format!("{slug}/{prefix}/");
    Ok(newest_by_d(
        events
            .into_iter()
            .filter(|ev| d_of(ev).starts_with(&wanted))
            .collect(),
    ))
}

async fn entity_dispatch(
    kind: u32,
    prefix: &str,
    cmd: crate::ProductionEntityCmd,
    client: &BuzzClient,
) -> Result<(), CliError> {
    match cmd {
        crate::ProductionEntityCmd::List { slug } => {
            let authors = trusted_authors(client, &slug).await?;
            let events = entity_fetch(client, kind, prefix, &slug, None, &authors).await?;
            let mut list: Vec<serde_json::Value> = events
                .iter()
                .map(entity_summary)
                .filter(|e| e["content"]["deleted"].as_bool() != Some(true))
                .collect();
            list.sort_by(|a, b| a["id"].as_str().cmp(&b["id"].as_str()));
            println!("{}", serde_json::to_string(&list).unwrap_or_default());
            Ok(())
        }
        crate::ProductionEntityCmd::Get { slug, id } => {
            let authors = trusted_authors(client, &slug).await?;
            let events = entity_fetch(client, kind, prefix, &slug, Some(&id), &authors).await?;
            let newest = events
                .first()
                .filter(|e| entity_summary(e)["content"]["deleted"].as_bool() != Some(true))
                .ok_or_else(|| CliError::Other(format!("{prefix} {id:?} not found in {slug:?}")))?;
            println!(
                "{}",
                serde_json::to_string(&entity_summary(newest)).unwrap_or_default()
            );
            Ok(())
        }
        crate::ProductionEntityCmd::Set {
            slug,
            id,
            content,
            content_file,
        } => {
            if !entity_id_ok(&id) {
                return Err(CliError::Usage(
                    "id must be 1-64 chars of [a-z0-9-_]".into(),
                ));
            }
            let raw = match (content, content_file) {
                (Some(c), None) if c == "-" => {
                    let mut buf = String::new();
                    std::io::Read::read_to_string(&mut std::io::stdin(), &mut buf)
                        .map_err(|e| CliError::Other(format!("stdin: {e}")))?;
                    buf
                }
                (Some(c), None) => c,
                (None, Some(path)) => std::fs::read_to_string(&path)
                    .map_err(|e| CliError::Usage(format!("cannot read {path}: {e}")))?,
                _ => return Err(CliError::Usage("pass --content or --content-file".into())),
            };
            let value: serde_json::Value = serde_json::from_str(&raw)
                .map_err(|e| CliError::Usage(format!("content must be JSON: {e}")))?;
            super::productions_validate::validate_entity(kind, &id, &value)
                .map_err(CliError::Usage)?;
            ensure_trusted_writer(client, &slug).await?;
            publish_entity(client, kind, prefix, &slug, &id, &value).await
        }
        crate::ProductionEntityCmd::Delete { slug, id } => {
            ensure_trusted_writer(client, &slug).await?;
            publish_entity(
                client,
                kind,
                prefix,
                &slug,
                &id,
                &serde_json::json!({"deleted": true}),
            )
            .await
        }
    }
}

/// A write from outside the production's trusted set is accepted by the relay
/// and shown by nobody; refuse it instead of reporting success.
async fn ensure_trusted_writer(client: &BuzzClient, slug: &str) -> Result<(), CliError> {
    let authors = trusted_authors(client, slug).await?;
    if authors.contains(&self_hex(client)) {
        return Ok(());
    }
    Err(CliError::Usage(format!(
        "this agent is not on the team of production {slug:?}, so its writes would not be shown; \
         nothing was written. Ask the owner to add it in the production's Team tab."
    )))
}

async fn publish_entity(
    client: &BuzzClient,
    kind: u32,
    prefix: &str,
    slug: &str,
    id: &str,
    value: &serde_json::Value,
) -> Result<(), CliError> {
    let d_tag = format!("{slug}/{prefix}/{id}");
    let content = serde_json::to_string(value).unwrap_or_default();
    let builder = buzz_sdk::build_production_entity(kind, &d_tag, &content)
        .map_err(|e| CliError::Usage(e.to_string()))?;
    let event = client.sign_event(builder)?;
    let resp = client.submit_event(event.clone()).await?;
    println!(
        "{}",
        serde_json::json!({ "d": d_tag, "event_id": event.id.to_hex(), "relay": resp })
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn entity(id: &str, author: &str, d: &str, created_at: i64) -> serde_json::Value {
        json!({"id": id, "pubkey": author, "created_at": created_at, "tags": [["d", d]], "content": "{}"})
    }

    #[test]
    fn team_is_the_owner_plus_listed_agents() {
        let production = json!({"pubkey": "AA", "tags": [["d", "jony"], ["agent", "BB", "write"], ["agent", "bb"], ["c", "x"]]});
        assert_eq!(
            team_authors(&production),
            vec!["aa".to_string(), "bb".to_string()]
        );
    }

    #[test]
    fn newest_wins_across_authors_and_ties_break_on_lowest_id() {
        let heads = newest_by_d(vec![
            entity("09", "owner", "jony/ep/ep01", 10),
            entity("07", "agent", "jony/ep/ep01", 20),
            entity("05", "owner", "jony/ep/ep02", 30),
            entity("03", "agent", "jony/ep/ep02", 30),
        ]);
        let picked: Vec<&str> = heads
            .iter()
            .map(|e| e["id"].as_str().unwrap_or(""))
            .collect();
        assert_eq!(picked, vec!["07", "03"]);
    }
}
