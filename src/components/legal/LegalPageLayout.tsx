import { type ReactNode } from 'react';
import { V2Page } from '@/features/arxon-v2/design/Kit';
import { Body, FrostPanel, GlassSheet, pc, ProfileHead } from '@/features/arxon-v2/design/ProfileChrome';
import { neon } from '@/features/arxon-v2/design/neonTokens';
import LegalLinks from './LegalLinks';

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

export default function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <V2Page>
      <ProfileHead title={title} subtitle={`Updated ${lastUpdated}`} />
      <div style={{ padding: '0 16px 20px' }}>
        <FrostPanel>
          <Body ink>
            Please read this in full. It is part of using Arxon.
          </Body>
        </FrostPanel>
        <GlassSheet title="Document" style={{ padding: '14px 14px 16px' }}>
          <article
            style={{
              color: pc.soft,
              fontSize: 13,
              lineHeight: 1.55,
              fontFamily: neon.font,
              fontWeight: 500,
            }}
            className="arxon-legal"
          >
            {children}
          </article>
        </GlassSheet>
        <p style={{ margin: '8px 2px 0', fontSize: 12, color: pc.soft, textAlign: 'center', fontFamily: neon.font }}>
          Also see <LegalLinks linkClassName="text-[#accafe]" />
        </p>
      </div>
      <style>{`
        .arxon-legal h2 {
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.2px;
          margin: 18px 0 8px;
          line-height: 1.3;
        }
        .arxon-legal h2:first-child { margin-top: 0; }
        .arxon-legal p { margin: 0 0 10px; color: #8c8f99; }
        .arxon-legal ul { margin: 0 0 12px; padding-left: 18px; }
        .arxon-legal li { margin: 0 0 6px; color: #8c8f99; }
        .arxon-legal strong { color: #fff; font-weight: 650; }
        .arxon-legal a { color: #accafe; text-decoration: none; }
      `}</style>
    </V2Page>
  );
}
