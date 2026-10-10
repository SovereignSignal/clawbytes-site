import { publicWires } from '@/config/brand';

/** Illustrative desk for Tools, Models, and Repos. Real follow links live in the channel cards. */
const focus: Record<string, string> = {
  tools: 'ship with',
  models: 'build on',
  repos: 'read next',
};

export function WireConsole() {
  const wires = publicWires();
  return (
    <div className="console" aria-hidden="true">
      <div className="console-frame">
        <div className="console-bar">
          <span className="console-dots">
            <span />
            <span />
            <span />
          </span>
          <span className="console-title">BYTES</span>
          <span className="live-dot" />
        </div>
        <div className="console-sub">
          <span>Bytes desk</span>
          <span className="console-live">live</span>
        </div>
        <div className="console-cols">
          <span>Track</span>
          <span>Focus</span>
          <span>Status</span>
        </div>
        <div className="console-rows">
          {wires.map((wire) => (
            <div key={wire.id} className="console-row">
              <span className="console-wire">
                <span className="status-dot" />
                {wire.label}
              </span>
              <span className="console-handle">{focus[wire.id] ?? wire.label}</span>
              <span className="console-badge">live</span>
            </div>
          ))}
        </div>
        <div className="console-line">
          <span className="prompt">»</span> where it's going
        </div>
        <div className="console-summary">
          <span><span className="console-key">TRACKS</span> {wires.length}</span>
          <span><span className="console-key">AHEAD</span> <span className="good">yes</span></span>
          <span><span className="console-key">WEEKLY</span> <span className="good">on</span></span>
        </div>
      </div>
      <span className="console-cap cap-tl" />
      <span className="console-cap cap-tr" />
      <span className="console-cap cap-bl" />
      <span className="console-cap cap-br" />
    </div>
  );
}
