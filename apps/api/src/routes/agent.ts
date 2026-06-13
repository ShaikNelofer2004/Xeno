import { Router, Request, Response } from 'express';
import { db } from '../db';
import { runAgent } from '../agent/runner';

export const agentRoutes = Router();

// POST /api/agent/run — start a new agent run
agentRoutes.post('/run', async (req: Request, res: Response) => {
  try {
    const { goal } = req.body as { goal: string };
    if (!goal?.trim()) {
      return res.status(400).json({ error: 'goal is required' });
    }

    // Create a run record immediately
    const { data: run, error } = await db
      .from('agent_runs')
      .insert({ goal: goal.trim(), steps: [], status: 'running' })
      .select()
      .single();

    if (error) throw error;

    // Kick off the agent loop in the background (non-blocking)
    runAgent(run.id, goal.trim()).catch((err) =>
      console.error(`Agent run ${run.id} failed:`, err.message)
    );

    res.status(201).json({ run_id: run.id, message: 'Agent started' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agent/stream/:runId — SSE stream of agent steps
agentRoutes.get('/stream/:runId', async (req: Request, res: Response) => {
  const { runId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Poll DB every 800ms and stream new steps to client
  let lastStepCount = 0;
  let isCompleted = false;

  const poll = async () => {
    try {
      const { data: run } = await db
        .from('agent_runs')
        .select('steps, status, campaign_id')
        .eq('id', runId)
        .single();

      if (!run) {
        res.write(`event: error\ndata: ${JSON.stringify({ message: 'Run not found' })}\n\n`);
        res.end();
        return;
      }

      const steps = (run.steps as any[]) ?? [];

      // Stream any new steps since last poll
      if (steps.length > lastStepCount) {
        const newSteps = steps.slice(lastStepCount);
        for (const step of newSteps) {
          res.write(`event: step\ndata: ${JSON.stringify(step)}\n\n`);
        }
        lastStepCount = steps.length;
      }

      // Stream completion or failure
      if ((run.status === 'completed' || run.status === 'failed') && !isCompleted) {
        isCompleted = true;
        res.write(`event: ${run.status}\ndata: ${JSON.stringify({
          campaign_id: run.campaign_id,
          status: run.status,
        })}\n\n`);
        res.end();
        return;
      }

      if (!isCompleted) {
        setTimeout(poll, 800);
      }
    } catch (err: any) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
      res.end();
    }
  };

  // Start polling
  poll();

  // Clean up on client disconnect
  req.on('close', () => {
    isCompleted = true;
  });
});

// GET /api/agent/runs — list recent agent runs
agentRoutes.get('/runs', async (_req, res) => {
  try {
    const { data, error } = await db
      .from('agent_runs')
      .select('id, goal, status, campaign_id, created_at, completed_at')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agent/runs/:id — full run with steps
agentRoutes.get('/runs/:id', async (req, res) => {
  try {
    const { data, error } = await db
      .from('agent_runs')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});
