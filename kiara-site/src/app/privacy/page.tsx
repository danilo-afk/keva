import { type Metadata } from "next";

import { LegalPage } from "@/components/landing/legal-page";
import { SITE_NAME } from "@/core/seo/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy Policy for ${SITE_NAME}.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updatedAt="June 23, 2026">
      <p>
        This Privacy Policy explains how {SITE_NAME} (&quot;we&quot;,
        &quot;us&quot;) collects, uses, and protects your information when you
        use the Service.
      </p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li>
          <strong>Account data:</strong> name, email, and authentication
          details.
        </li>
        <li>
          <strong>Content:</strong> prompts, inputs, and generated outputs.
        </li>
        <li>
          <strong>Usage data:</strong> logs, device, and analytics needed to
          operate the Service.
        </li>
      </ul>

      <h2>2. How We Use Information</h2>
      <p>
        We use your information to provide and improve the Service, process
        billing, ensure security, and comply with legal obligations. We do not
        sell your personal data.
      </p>

      <h2>3. AI Processing</h2>
      <p>
        Prompts and inputs may be processed by AI model providers to generate
        outputs. We share only what is necessary to deliver the requested
        result.
      </p>

      <h2>4. Data Retention</h2>
      <p>
        We retain data for as long as your account is active or as needed to
        provide the Service and meet legal requirements. You may request
        deletion of your account and associated data.
      </p>

      <h2>5. Your Rights</h2>
      <p>
        Depending on your jurisdiction, you may have the right to access,
        correct, export, or delete your personal data. To exercise these rights,
        contact us.
      </p>

      <h2>6. Security</h2>
      <p>
        We apply reasonable technical and organizational measures to protect
        your data, though no method of transmission or storage is fully secure.
      </p>

      <h2>7. Changes</h2>
      <p>
        We may update this Policy periodically. Material changes will be
        communicated through the Service.
      </p>

      <h2>8. Contact</h2>
      <p>
        For privacy inquiries, contact us at{" "}
        <a href="mailto:contato@kiara.ai">contato@kiara.ai</a>.
      </p>
    </LegalPage>
  );
}
