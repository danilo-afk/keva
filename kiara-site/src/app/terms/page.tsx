import { type Metadata } from "next";

import { LegalPage } from "@/components/landing/legal-page";
import { SITE_NAME } from "@/core/seo/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of Service for ${SITE_NAME}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updatedAt="June 23, 2026">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use
        of {SITE_NAME} (the &quot;Service&quot;). By using the Service, you agree
        to be bound by these Terms. If you do not agree, do not use the Service.
      </p>

      <h2>1. Use of the Service</h2>
      <p>
        You may use the Service only in compliance with these Terms and all
        applicable laws. You are responsible for your account, the content you
        generate, and keeping your credentials secure.
      </p>

      <h2>2. User Content</h2>
      <p>
        You retain ownership of the content you create with the Service. You are
        solely responsible for ensuring you have the rights to any input you
        provide and that generated content does not infringe third-party rights
        or violate applicable law.
      </p>

      <h2>3. Acceptable Use</h2>
      <ul>
        <li>No illegal, harmful, or abusive content.</li>
        <li>No infringement of intellectual property or privacy rights.</li>
        <li>No attempts to disrupt, reverse engineer, or overload the Service.</li>
      </ul>

      <h2>4. Plans and Billing</h2>
      <p>
        Paid plans are billed in advance on a recurring basis. Usage limits per
        plan are described on our pricing page and may change with notice.
      </p>

      <h2>5. Disclaimer</h2>
      <p>
        The Service is provided &quot;as is&quot; without warranties of any
        kind. AI-generated output may be inaccurate; you are responsible for
        reviewing it before use.
      </p>

      <h2>6. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, {SITE_NAME} shall not be liable
        for any indirect, incidental, or consequential damages arising from your
        use of the Service.
      </p>

      <h2>7. Changes</h2>
      <p>
        We may update these Terms from time to time. Continued use of the
        Service after changes take effect constitutes acceptance of the revised
        Terms.
      </p>

      <h2>8. Contact</h2>
      <p>
        Questions about these Terms? Contact us at{" "}
        <a href="mailto:contato@kiara.ai">contato@kiara.ai</a>.
      </p>
    </LegalPage>
  );
}
