import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { LEGAL_CONTACT_EMAIL } from '@/lib/legal/stakeCompliance';

export default function PrivacyPolicy() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="August 21, 2025">
      <p>
        This Privacy Policy explains how Arxon (&quot;we,&quot; &quot;us&quot;) collects, uses, and
        protects information when you use the Arxon mobile app, web experience, mining platform,
        Arena, Dice, and related services (the &quot;Service&quot;).
      </p>

      <h2>1. Information We Collect</h2>
      <p>Depending on how you use the Service, we may collect:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Account data:</strong> email address, username, profile details, referral codes,
          and authentication identifiers (via Supabase Auth)
        </li>
        <li>
          <strong>Mining &amp; points activity:</strong> session timing, ARX-P balances, claims,
          task completion, and reward history
        </li>
        <li>
          <strong>Arena &amp; votes:</strong> battle selections, stake amounts, outcomes, and
          leaderboard participation
        </li>
        <li>
          <strong>Game activity:</strong> Dice match history, Word Forge progress, and in-game scores
        </li>
        <li>
          <strong>Device &amp; push:</strong> device tokens for notifications, app version, and
          coarse usage signals needed to operate OTA updates
        </li>
        <li>
          <strong>Security logs:</strong> IP-derived signals, rate-limit events, and anti-abuse
          fingerprints where enabled
        </li>
      </ul>

      <h2>2. How We Use Information</h2>
      <p>We use collected data to:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Provide accounts, mining, Arena, Dice, and reward features</li>
        <li>Process stakes, resolve battles, and calculate payouts</li>
        <li>Send optional push notifications you enable in Settings</li>
        <li>Prevent fraud, enforce limits, and protect the platform</li>
        <li>Improve performance, fix bugs, and analyze aggregate usage</li>
        <li>Comply with legal obligations</li>
      </ul>

      <h2>3. Sharing</h2>
      <p>
        We do not sell your personal information. We share data only with infrastructure providers
        (e.g., hosting, auth, database, push delivery) under contracts that require appropriate
        safeguards, or when required by law. Public leaderboards may display usernames and scores
        you choose to expose through gameplay.
      </p>

      <h2>4. Retention</h2>
      <p>
        We retain account and activity data while your account is active and as needed for
        operations, dispute resolution, and legal compliance. You may request account deletion
        subject to retention required for fraud prevention or unresolved stakes.
      </p>

      <h2>5. Your Choices</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Manage notification categories in Settings</li>
        <li>Update profile and security credentials in the app</li>
        <li>Contact us to access, correct, or delete personal data where applicable</li>
      </ul>

      <h2>6. Security</h2>
      <p>
        We apply industry-standard measures including encrypted transport, access controls, and
        monitoring. No system is perfectly secure; report concerns to{' '}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
      </p>

      <h2>7. Children</h2>
      <p>
        The Service is not directed to anyone under 18. We do not knowingly collect data from
        minors. Staking and wagering features require age confirmation.
      </p>

      <h2>8. International Users</h2>
      <p>
        Data may be processed in countries where our providers operate. By using the Service, you
        consent to transfer and processing subject to this Policy and applicable law.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update this Policy. The &quot;Last updated&quot; date reflects the latest revision.
        Continued use after changes constitutes acceptance.
      </p>

      <h2>10. Contact</h2>
      <p>
        Privacy inquiries:{' '}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
      </p>
    </LegalPageLayout>
  );
}
