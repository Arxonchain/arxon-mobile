import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { LEGAL_CONTACT_EMAIL } from '@/lib/legal/stakeCompliance';

export default function TermsOfService() {
  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="August 21, 2025">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of the Arxon mobile and web
        applications, mining platform, Arena prediction features, Dice games, and related services
        (collectively, the &quot;Service&quot;) operated by Arxon (&quot;we,&quot; &quot;us,&quot; or
        &quot;our&quot;).
      </p>

      <h2>1. Acceptance</h2>
      <p>
        By creating an account or using the Service, you agree to these Terms and our Privacy
        Policy. If you do not agree, do not use the Service.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least <strong>18 years old</strong> (or the age of majority in your
        jurisdiction, whichever is higher) to use staking, prediction, or wagering features. You are
        responsible for ensuring your use complies with local laws.
      </p>

      <h2>3. ARX-P Points — No Cash Value</h2>
      <p>
        ARX-P (&quot;points&quot;) are in-app loyalty and gameplay units earned through mining,
        tasks, referrals, and game activity. Points:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Have <strong>no guaranteed cash value</strong> and are not legal tender</li>
        <li>Are not securities, deposits, or investment products</li>
        <li>May be modified, capped, or discontinued as described in app updates or announcements</li>
        <li>Conversion to $ARX tokens, where offered, is subject to separate program rules and eligibility</li>
      </ul>

      <h2>4. Arena &amp; Dice — Entertainment Only</h2>
      <p>
        Prediction markets, battle staking, and Dice modes are provided for <strong>entertainment</strong>.
        Outcomes involve chance and community participation. We do not guarantee winnings, returns,
        or mining boosts. Nothing in the Service constitutes financial, legal, or gambling advice.
      </p>
      <p>
        Staked points are locked until events resolve and may be lost entirely. Past performance
        of pools or leaderboards does not predict future results.
      </p>

      <h2>5. Account Responsibilities</h2>
      <p>
        You are responsible for safeguarding your credentials and for all activity under your
        account. One person per account unless we explicitly authorize otherwise. Abuse, fraud,
        botting, multi-accounting, or circumventing limits may result in suspension and forfeiture
        of points.
      </p>

      <h2>6. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Reverse engineer, scrape, or attack the Service or its infrastructure</li>
        <li>Use the Service where prediction or skill-based wagering is prohibited</li>
        <li>Harass other users or submit false reports</li>
        <li>Misrepresent your identity, age, or jurisdiction</li>
      </ul>

      <h2>7. Disclaimers</h2>
      <p>
        THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. We do not warrant
        uninterrupted access, error-free operation, or specific reward amounts. Blockchain,
        third-party, and network delays are outside our control.
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, Arxon and its affiliates are not liable for indirect,
        incidental, or consequential damages, lost points, lost profits, or data loss arising from
        your use of the Service.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update these Terms. Material changes will be reflected in the &quot;Last updated&quot;
        date. Continued use after changes constitutes acceptance.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about these Terms:{' '}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
      </p>
    </LegalPageLayout>
  );
}
