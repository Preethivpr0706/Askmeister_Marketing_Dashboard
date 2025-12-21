import { TrendingUp, TrendingDown } from 'lucide-react';
import './StatCard.css';

function StatCard({ title, value, change = '0%', icon, color }) {
  const isPositive = change && change.startsWith('+');
  const hasChange = change && change !== '0%';

  return (
    <div className={`stat-card-modern stat-card-${color}`}>
      <div className="stat-card-content">
        <div className="stat-card-header">
          <div className="stat-icon-wrapper">
            {icon}
          </div>
          <div className="stat-change-badge">
            {hasChange && (
              <>
                {isPositive ? (
                  <TrendingUp size={14} className="trend-icon positive" />
                ) : (
                  <TrendingDown size={14} className="trend-icon negative" />
                )}
                <span className={`stat-change ${isPositive ? 'positive' : 'negative'}`}>
                  {change}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="stat-card-body">
          <div className="stat-value-modern">{value || '0'}</div>
          <div className="stat-title-modern">{title}</div>
        </div>
      </div>
    </div>
  );
}

export default StatCard;