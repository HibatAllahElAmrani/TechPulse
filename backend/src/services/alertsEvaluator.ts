import type { Pool } from 'pg';

// pg : means a database connection pool
export interface TriggeredAlert {
  alert_id: string;
  project: string;
  metric: string;
  operator: string;
  threshold: number;
  current_value: number;
}

export async function evaluateAlerts(pg: Pool): Promise<{ evaluated: number; triggered: TriggeredAlert[] }> {
  const { rows: activeAlerts } = await pg.query(
    `SELECT a.*, p.owner, p.repo
     FROM alerts a
     JOIN projects p ON p.id = a.project_id
     WHERE a.is_active = TRUE`
  );

  const triggered: TriggeredAlert[] = [];

  for (const alert of activeAlerts) {
    const { rows: metricRows } = await pg.query(
      `SELECT stars, forks, open_issues, open_prs, commits_30d
       FROM metrics_snapshots
       WHERE project_id = $1
       ORDER BY time DESC LIMIT 1`,
      [alert.project_id]
    );

    if (metricRows.length === 0) continue;

    const currentValue = metricRows[0][alert.metric];
    if (currentValue === undefined) continue;

    let isTriggered = false;
    if (alert.operator === '>' && currentValue > alert.threshold) isTriggered = true;
    if (alert.operator === '<' && currentValue < alert.threshold) isTriggered = true;

    if (isTriggered) {
      await pg.query(
        `UPDATE alerts SET last_triggered_at = NOW() WHERE id = $1`,
        [alert.id]
      );

      triggered.push({
        alert_id: alert.id,
        project: `${alert.owner}/${alert.repo}`,
        metric: alert.metric,
        operator: alert.operator,
        threshold: alert.threshold,
        current_value: currentValue,
      });
    }
  }

  return { evaluated: activeAlerts.length, triggered };
}