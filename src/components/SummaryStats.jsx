import { formatDuration } from "../utils/time";

const statsConfig = [
  ["totalAvailableTime", "Total"],
  ["totalStudyTime", "Study"],
  ["totalNonStudyTime", "Non-study"],
];

export default function SummaryStats({ stats }) {
  return (
    <section className="stats-grid" aria-label="Summary stats">
      {statsConfig.map(([key, label]) => (
        <div className="stat-card" key={key}>
          <span>{label}</span>
          <strong>{formatDuration(stats[key])}</strong>
        </div>
      ))}
    </section>
  );
}
