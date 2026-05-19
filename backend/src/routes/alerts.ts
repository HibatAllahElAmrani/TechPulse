import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { evaluateAlerts } from "../services/alertsEvaluator.js";

const createAlertSchema = z.object({
  project_id: z.string().uuid(),
  metric: z.enum(['stars', 'forks', 'open_issues', 'open_prs', 'commits_30d']),
  operator: z.enum(['>', '<', 'delta_pct']),
  threshold: z.number(),
  notification_channels: z.array(z.enum(['in_app', 'slack', 'email'])).default(['in_app']),
});

const alertsRoutes: FastifyPluginAsync = async (fastify) => {

  // POST /alerts - create an alert
  fastify.post('/alerts', async (req, res) => {
    const parsed = createAlertSchema.safeParse(req.body);
    if (!parsed.success) {
      res.code(400);
      return { error: 'Invalid input', details: parsed.error.format() };
    }

    const { project_id, metric, operator, threshold, notification_channels } = parsed.data;

    const { rows } = await fastify.pg.query(
      `INSERT INTO alerts (project_id, metric, operator, threshold, notification_channels)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [project_id, metric, operator, threshold, JSON.stringify(notification_channels)]
    );

    res.code(201);
    return rows[0];
  });

  // GET /alerts - list all alerts
  fastify.get('/alerts', async () => {
    const { rows } = await fastify.pg.query(
      `SELECT a.*, p.full_name AS project_name
       FROM alerts a
       JOIN projects p ON p.id = a.project_id
       WHERE a.is_active = TRUE
       ORDER BY a.created_at DESC`
    );
    return { alerts: rows };
  });

  // DELETE /alerts/:id - delete an alert
  fastify.delete<{ Params: { id: string } }>('/alerts/:id', async (req, res) => {
    const { id } = req.params;
    const result = await fastify.pg.query(
      `DELETE FROM alerts WHERE id = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      res.code(404);
      return { error: 'Alert not found' };
    }
    return { success: true };
  });

  // POST /alerts/evaluate - check all active alerts against latest metrics
  fastify.post('/alerts/evaluate', async () => {
    return await evaluateAlerts(fastify.pg);
  });

};

export default alertsRoutes;