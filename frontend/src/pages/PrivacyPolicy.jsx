import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <section
      className="privacy-page"
      style={{ padding: "3rem 1rem 5rem", maxWidth: 900 }}
    >
      <div className="privacy-card" style={{ padding: "2rem" }}>
        <h1>Privacy Policy</h1>
        <p className="privacy-updated" ><strong>Last updated:</strong> September 23, 2026</p>

        <p>
          Adams Collection ("we", "us", or "our") respects your privacy.
          This Privacy Policy explains what information may be collected when
          you use our website, mobile application, and related ecommerce
          services, how it is used, and the choices available to you.
        </p>

        <h2>1. Information We Collect</h2>
        <p>Depending on how you use Adams Collection, we may collect:</p>
        <ul>
          <li><strong>Account information:</strong> name, email address, telephone number, password credentials, and profile information.</li>
          <li><strong>Delivery information:</strong> shipping and billing details, city, country, and other information needed to fulfill an order.</li>
          <li><strong>Transaction information:</strong> orders, purchased products, amounts, payment status, refunds, and payment-provider transaction identifiers.</li>
          <li><strong>Shopping activity:</strong> cart contents, product interactions, searches, and account activity.</li>
          <li><strong>Technical information:</strong> IP address, device or browser information, user-agent information, and security or diagnostic information.</li>
          <li><strong>Optional location information:</strong> location-related information when you provide it or when it is necessary for a feature you choose to use.</li>
        </ul>

        <h2>2. How We Use Information</h2>
        <ul>
          <li>Create and manage customer accounts.</li>
          <li>Process carts, orders, payments, refunds, and deliveries.</li>
          <li>Provide customer support and communicate about accounts or orders.</li>
          <li>Improve products, services, security, and user experience.</li>
          <li>Detect fraud, abuse, unauthorized access, and security threats.</li>
          <li>Maintain business, legal, and accounting records.</li>
        </ul>

        <h2>3. Payments</h2>
        <p>
          Payments may be processed through third-party payment providers.
          We may receive transaction information needed to confirm and
          reconcile a payment. Sensitive payment credentials are handled
          according to the applicable payment provider's systems and policies.
        </p>

        <h2>4. Information Sharing</h2>
        <p>
          We do not sell personal information as part of our ordinary
          ecommerce operations. Information may be shared with service
          providers that help operate the service, including payment,
          hosting, delivery, analytics, security, and infrastructure
          providers.
        </p>

        <p>
          Information may also be disclosed when required by applicable law,
          legal process, or to protect the rights, security, and property of
          Adams Collection, our customers, or others.
        </p>

        <h2>5. Cookies and Local Storage</h2>
        <p>
          The web application may use cookies, local storage, or similar
          technologies for authentication, shopping state, preferences, and
          security-related functionality. Disabling these technologies may
          affect application functionality.
        </p>

        <h2>6. Data Security</h2>
        <p>
          We use reasonable technical and organizational measures intended to
          protect personal information against unauthorized access,
          alteration, disclosure, or destruction. No internet-based service
          can guarantee absolute security.
        </p>

        <h2>7. Data Retention</h2>
        <p>
          Information is retained for as long as reasonably necessary to
          provide services, maintain transaction records, resolve disputes,
          prevent abuse, and comply with applicable legal obligations.
        </p>

        <h2>8. Your Choices and Rights</h2>
        <p>
          Depending on applicable law, you may have rights to request access
          to, correction of, deletion of, or information about personal data
          we hold about you.
        </p>

        <h2>9. Children's Privacy</h2>
        <p>
          Adams Collection is not intended to knowingly collect personal
          information from children where collection is prohibited by
          applicable law.
        </p>

        <h2>10. Third-Party Services</h2>
        <p>
          Our service may contain integrations or links to third-party
          services. Those services have their own privacy practices and terms.
        </p>

        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy when our services, practices, or
          legal requirements change. The updated version will be published on
          this page with a revised "Last updated" date.
        </p>

        <h2>12. Contact</h2>
        <p>
          If you have questions about this Privacy Policy or want to exercise
          an applicable privacy right, please contact Adams Collection through
          the official contact details provided by the service.
        </p>

        <p className="privacy-back" style={{ marginTop: "2rem" }}>
          <Link to="/">Return to Adams Collection</Link>
        </p>
      </div>
    </section>
  );
}