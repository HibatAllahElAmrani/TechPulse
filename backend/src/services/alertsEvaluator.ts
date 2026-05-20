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


/* The evaluateAlerts funct takes pg as its only INPUT 
and RETURNS a promise that resolves to an object with 2 things: 
how many alerts were checked & and which ones fired

It takes pg as a parameter instead of importing it directly because this function is :
PURE and REUSABLE 
So whoever calls it just passes their database connection. 
The route (when calling it) passes fastify.pg, the scheduler passes fastify.pg too. Same function, same result.
*/
export async function evaluateAlerts(pg: Pool): Promise<{  evaluated: number; triggered: TriggeredAlert[] }> { 
  const { rows: activeAlerts } = await pg.query( // This fetches every active alert from the database
    `SELECT a.*, p.owner, p.repo
     FROM alerts a
     JOIN projects p ON p.id = a.project_id
     WHERE a.is_active = TRUE`
  );

  const triggered: TriggeredAlert[] = [];

  for (const alert of activeAlerts) { // Loops through every alert one by one
    const { rows: metricRows } = await pg.query( // For this alert's project, fetch the most recent metrics snapshot from the database
      `SELECT stars, forks, open_issues, open_prs, commits_30d
       FROM metrics_snapshots
       WHERE project_id = $1
       ORDER BY time DESC LIMIT 1`, // means "give me only the latest one"
      [alert.project_id] 
    );

    if (metricRows.length === 0) continue; // If there are no snapshots yet for this project => skip this alert and move on 

    const currentValue = metricRows[0][alert.metric];
    if (currentValue === undefined) continue;

    let isTriggered = false;
    if (alert.operator === '>' && currentValue > alert.threshold) isTriggered = true;
    if (alert.operator === '<' && currentValue < alert.threshold) isTriggered = true;
    if (alert.operator === 'delta_pct') {
    // Get the previous snapshot to compare against
      const { rows: prevRows } = await pg.query(
        `SELECT ${alert.metric}
        FROM metrics_snapshots
        WHERE project_id = $1
        ORDER BY time DESC
        LIMIT 1 OFFSET 1`,
        [alert.project_id]
      );
    if (prevRows.length > 0) {
      const previousValue = prevRows[0][alert.metric];
      if (previousValue && previousValue !== 0) {
        const changePct = Math.abs((currentValue - previousValue) / previousValue) * 100;
        if (changePct >= alert.threshold) isTriggered = true;
      }
    }
  }
      
    if (isTriggered) { // If the condition fired : stamp it with the current time in the database & add it to the triggered array that gets returned at the end
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
