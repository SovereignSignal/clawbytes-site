import { publicWires } from '@/config/brand';

/** Illustrative desk for the three public wires. Real join links live in the channel cards. */
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
          <span>Wire desk</span>
          <span className="console-live">live</span>
        </div>
        <div className="console-cols">
          <span>Wire</span>
          <span>Channel</span>
          <span>Status</span>
        </div>
        <div className="console-rows">
          {wires.map((wire) => (
            <div key={wire.id} className="console-row">
              <span className="console-wire">
                <span className="status-dot" />
                {wire.label}
              </span>
              <span className="console-handle">{wire.handle}</span>
              <span className="console-badge">open</span>
            </div>
          ))}
        </div>
        <div className="console-line">
          <span className="prompt">»</span> curated tier · weekly letter
        </div>
        <div className="console-summary">
          <span><span className="console-key">WIRES</span> {wires.length}</span>
          <span><span className="console-key">CURATED</span> <span className="good">yes</span></span>
          <span><span className="console-key">JOIN</span> <span className="good">open</span></span>
        </div>
      </div>
      <span className="console-cap cap-tl" />
      <span className="console-cap cap-tr" />
      <span className="console-cap cap-bl" />
      <span className="console-cap cap-br" />
    </div>
  );
}
