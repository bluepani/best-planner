import { formatDuration, getTypeColor, normalizeTypeDefinitions } from "../utils/time";

export default function TypeBreakdown({ blocks, freeTime, autoFunBlock, typeDefinitions }) {
  const displayTypes = normalizeTypeDefinitions(typeDefinitions);
  const hasFunType = displayTypes.some((type) => type.name === "Fun");
  const types = hasFunType
    ? displayTypes
    : [...displayTypes, { name: "Fun", color: getTypeColor("Fun") }];
  const totals = types.reduce((accumulator, type) => {
    accumulator[type.name] = 0;
    return accumulator;
  }, {});

  blocks.forEach((block) => {
    const type = totals[block.type] !== undefined ? block.type : types[0].name;
    totals[type] += Number(block.duration || 0);
  });

  if (autoFunBlock) {
    totals.Fun += Number(freeTime || 0);
  }
  const totalMinutes = Object.values(totals).reduce((sum, value) => sum + value, 0);

  return (
    <section className="panel breakdown-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Day mix</p>
          <h2>Type Breakdown</h2>
        </div>
      </div>

      <div className="breakdown-list">
        {types.map((type) => {
          const minutes = totals[type.name];
          const percent = totalMinutes ? Math.round((minutes / totalMinutes) * 100) : 0;
          const color = type.color || getTypeColor(type.name, typeDefinitions);

          return (
            <div className="breakdown-item" key={type.name}>
              <div className="breakdown-row">
                <span className="breakdown-label">
                  <span
                    className="breakdown-dot"
                    style={{ backgroundColor: color }}
                  />
                  {type.name}
                </span>
                <strong>{formatDuration(minutes)}</strong>
              </div>
              <div className="breakdown-track" aria-hidden="true">
                <span
                  style={{
                    width: `${percent}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <p className="breakdown-note">
        {autoFunBlock
          ? "Free time is counted as Fun."
          : "Free time stays unplanned until you add blocks or turn on auto Fun."}
      </p>
    </section>
  );
}
