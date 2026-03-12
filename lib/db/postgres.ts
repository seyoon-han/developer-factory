import { Pool, QueryResult } from 'pg';

// AWS RDS Aurora PostgreSQL Configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'factory-dev.cluster-cve2islarbof.us-east-2.rds.amazonaws.com',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_ID || 'postgres',
  password: process.env.DB_PW,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Default user ID for all operations
const DEFAULT_USER_ID = 'test0';

// Function to check build phase at runtime (not build time constant)
function isInBuildPhase() {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

// Helper to execute queries
async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

// Initialize database schema
async function initializeDatabase() {
  if (isInBuildPhase()) return;

  console.log('[PostgreSQL] Initializing database schema...');

  const schema = `
    -- ============================================
    -- Core Task Management Tables
    -- ============================================

    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      board_id TEXT NOT NULL,
      assignee TEXT,
      reference_task_ids TEXT,
      workflow_ids TEXT,
      use_context7 INTEGER DEFAULT 1,
      use_confluence INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS task_questions (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      task_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      answer TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS task_prompts (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      task_id INTEGER NOT NULL,
      original_description TEXT NOT NULL,
      enhanced_prompt TEXT,
      status TEXT DEFAULT 'pending',
      approved INTEGER DEFAULT 0,
      approved_at TIMESTAMP,
      refinement_status TEXT DEFAULT 'idle',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS task_queue (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      task_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      error TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      processed_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS task_implementation (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      task_id INTEGER NOT NULL UNIQUE,
      status TEXT DEFAULT 'waiting',
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      elapsed_seconds INTEGER DEFAULT 0,
      git_commit_hash TEXT,
      git_restore_point TEXT,
      implementation_report TEXT,
      report_status TEXT DEFAULT 'pending',
      report_generated_at TIMESTAMP,
      error TEXT,
      refinement_round INTEGER DEFAULT 1,
      refinement_feedback TEXT,
      refinement_status TEXT DEFAULT 'idle',
      priority TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS task_documents (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      task_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      url TEXT,
      uploaded_by TEXT,
      uploaded_at TIMESTAMP DEFAULT NOW(),
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS project_documents (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      project_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      url TEXT,
      uploaded_by TEXT,
      uploaded_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      description TEXT,
      category TEXT DEFAULT 'other',
      tags TEXT,
      is_public BOOLEAN DEFAULT FALSE,
      version INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS presubmit_evaluations (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      task_id INTEGER NOT NULL,
      expert_role TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      elapsed_seconds INTEGER DEFAULT 0,
      evaluation_report TEXT,
      action_points TEXT,
      overall_opinion TEXT,
      severity TEXT,
      error TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, task_id, expert_role)
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      user_id TEXT NOT NULL DEFAULT 'test0',
      demo_mode INTEGER DEFAULT 0,
      anthropic_api_key TEXT,
      openai_api_key TEXT,
      github_token TEXT,
      context7_api_key TEXT,
      gitlab_token TEXT,
      jira_config TEXT,
      slack_webhook TEXT,
      board_name TEXT DEFAULT 'Dev Automation Board',
      sidebar_title TEXT DEFAULT 'LuckyVR Factory',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      name TEXT NOT NULL,
      description TEXT,
      git_remote_url TEXT NOT NULL,
      git_branch TEXT DEFAULT 'main',
      git_last_commit TEXT,
      git_last_pull TIMESTAMP,
      local_path TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,
      framework TEXT,
      language TEXT,
      package_manager TEXT,
      clone_status TEXT DEFAULT 'pending',
      clone_error TEXT,
      last_sync_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, name),
      UNIQUE(user_id, local_path),
      CHECK (LENGTH(name) > 0 AND LENGTH(name) <= 100),
      CHECK (clone_status IN ('pending', 'cloning', 'ready', 'error'))
    );

    -- ============================================
    -- Token Usage Tracking
    -- ============================================

    CREATE TABLE IF NOT EXISTS token_usage (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      task_id INTEGER NOT NULL,
      phase TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      num_turns INTEGER DEFAULT 0,
      execution_time_ms INTEGER DEFAULT 0,
      refinement_round INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW(),
      CHECK (phase IN ('prompt_enhancement', 'implementation', 'refinement', 'presubmit', 'other')),
      CHECK (provider IN ('claude', 'openai', 'other'))
    );

    -- ============================================
    -- BMAD Workflow Builder Tables
    -- ============================================

    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      framework TEXT NOT NULL DEFAULT 'bmad',
      nl_input TEXT NOT NULL,
      yaml_definition TEXT NOT NULL,
      command_file TEXT NOT NULL,
      category TEXT DEFAULT 'custom',
      status TEXT DEFAULT 'draft',
      version INTEGER DEFAULT 1,
      tags TEXT,
      icon TEXT DEFAULT 'Workflow',
      metadata TEXT,
      created_by TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, name),
      CHECK (status IN ('draft', 'active', 'archived')),
      CHECK (category IN ('development', 'testing', 'deployment', 'documentation', 'code-review', 'custom'))
    );

    CREATE TABLE IF NOT EXISTS workflow_executions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      workflow_id TEXT NOT NULL,
      status TEXT NOT NULL,
      result TEXT,
      logs TEXT,
      error TEXT,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP,
      duration INTEGER,
      manifest_id TEXT,
      CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled'))
    );

    CREATE TABLE IF NOT EXISTS execution_manifests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      workflow_id TEXT NOT NULL,
      workflow_version INTEGER NOT NULL,
      execution_id TEXT NOT NULL,
      timestamp TIMESTAMP NOT NULL,
      inputs TEXT NOT NULL,
      model_version TEXT NOT NULL,
      seed INTEGER,
      tools TEXT NOT NULL,
      outputs TEXT NOT NULL,
      reproducible INTEGER DEFAULT 1,
      phases TEXT,
      metrics TEXT
    );

    -- ============================================
    -- MCP Servers (Model Context Protocol)
    -- ============================================

    CREATE TABLE IF NOT EXISTS mcp_servers (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      server_name TEXT NOT NULL,
      description TEXT,
      version TEXT,
      server_address TEXT,
      port INTEGER,
      protocol_type TEXT NOT NULL,
      connection_path TEXT DEFAULT '/',
      auth_type TEXT NOT NULL DEFAULT 'none',
      auth_token TEXT,
      auth_key_name TEXT,
      additional_headers TEXT,
      server_args TEXT,
      server_env TEXT,
      is_active INTEGER DEFAULT 1,
      last_test_at TIMESTAMP,
      last_test_status TEXT,
      last_test_error TEXT,
      available_tools TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, server_name),
      CHECK (protocol_type IN ('http', 'https', 'ws', 'wss', 'stdio')),
      CHECK (auth_type IN ('none', 'apiKey', 'bearer', 'oauth', 'basic')),
      CHECK (LENGTH(server_name) >= 1 AND LENGTH(server_name) <= 100)
    );

    -- ============================================
    -- Boards
    -- ============================================

    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      name TEXT NOT NULL,
      description TEXT,
      columns TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- ============================================
    -- Comments
    -- ============================================

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      task_id INTEGER NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- ============================================
    -- Labels
    -- ============================================

    CREATE TABLE IF NOT EXISTS labels (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, name)
    );

    -- ============================================
    -- Task Labels (Junction Table)
    -- ============================================

    CREATE TABLE IF NOT EXISTS task_labels (
      user_id TEXT NOT NULL DEFAULT 'test0',
      task_id INTEGER NOT NULL,
      label_id TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (user_id, task_id, label_id)
    );

    -- ============================================
    -- Webhook Events
    -- ============================================

    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      type TEXT NOT NULL,
      source TEXT NOT NULL,
      payload TEXT NOT NULL,
      task_id INTEGER,
      processed INTEGER DEFAULT 0,
      processed_at TIMESTAMP,
      error TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      CHECK (type IN ('push', 'pull_request', 'issue', 'comment', 'workflow_run'))
    );

    -- ============================================
    -- Automation Rules
    -- ============================================

    CREATE TABLE IF NOT EXISTS automation_rules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      name TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      trigger_type TEXT NOT NULL,
      trigger_config TEXT NOT NULL,
      action_type TEXT NOT NULL,
      action_config TEXT NOT NULL,
      priority INTEGER DEFAULT 0,
      description TEXT,
      last_triggered_at TIMESTAMP,
      trigger_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      CHECK (trigger_type IN ('webhook', 'status_change', 'schedule', 'label', 'comment')),
      CHECK (action_type IN ('move_task', 'add_label', 'notify', 'webhook', 'comment', 'assign'))
    );

    -- ============================================
    -- Integration Configs
    -- ============================================

    CREATE TABLE IF NOT EXISTS integration_configs (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      integration_type TEXT NOT NULL,
      config TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      last_sync_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, integration_type),
      CHECK (integration_type IN ('github', 'gitlab', 'jira', 'slack'))
    );

    -- ============================================
    -- Team Rulesets
    -- ============================================

    CREATE TABLE IF NOT EXISTS team_rulesets (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      name TEXT NOT NULL,
      description TEXT,
      version TEXT,
      body TEXT,
      when_apply TEXT,
      resources TEXT DEFAULT '[]',
      dependencies TEXT DEFAULT '[]',
      enabled INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, name),
      CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 100)
    );

    -- ============================================
    -- TDD Agentic Development Board Tables
    -- ============================================

    CREATE TABLE IF NOT EXISTS tdd_tasks (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      task_id INTEGER NOT NULL,
      tdd_status TEXT NOT NULL DEFAULT 'backlog',
      specification TEXT,
      acceptance_criteria TEXT,
      test_code TEXT,
      implementation_code TEXT,
      test_results TEXT,
      tdd_cycle_count INTEGER DEFAULT 0,
      current_phase TEXT DEFAULT 'spec_elicitation',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, task_id),
      CHECK (tdd_status IN (
        'backlog',
        'spec_elicitation',
        'awaiting_clarification',
        'test_generation',
        'implementation_draft',
        'code_refinement',
        'done'
      )),
      CHECK (current_phase IN (
        'spec_elicitation',
        'awaiting_clarification',
        'red_phase',
        'green_phase',
        'refactor_phase',
        'verification',
        'complete'
      ))
    );

    CREATE TABLE IF NOT EXISTS tdd_agent_state (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      tdd_task_id INTEGER NOT NULL,
      state_file_path TEXT NOT NULL,
      checkpoint_name TEXT NOT NULL,
      agent_context TEXT,
      paused_at TIMESTAMP DEFAULT NOW(),
      resumed_at TIMESTAMP,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS tdd_clarifications (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      tdd_task_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT DEFAULT 'text',
      suggested_options TEXT,
      user_answer TEXT,
      answer_type TEXT,
      answered_at TIMESTAMP,
      agent_state_id INTEGER,
      required INTEGER DEFAULT 1,
      order_index INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      CHECK (question_type IN ('text', 'choice', 'multi_choice', 'boolean'))
    );

    CREATE TABLE IF NOT EXISTS external_skills (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      skill_name TEXT NOT NULL,
      skill_path TEXT NOT NULL,
      description TEXT,
      activation_triggers TEXT,
      skill_content TEXT NOT NULL,
      version TEXT,
      is_core INTEGER DEFAULT 0,
      has_checklist INTEGER DEFAULT 0,
      has_diagrams INTEGER DEFAULT 0,
      has_examples INTEGER DEFAULT 0,
      last_synced_at TIMESTAMP DEFAULT NOW(),
      is_active INTEGER DEFAULT 1,
      source_repo TEXT DEFAULT 'obra/superpowers',
      UNIQUE(user_id, skill_name)
    );

    CREATE TABLE IF NOT EXISTS tdd_execution_logs (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      tdd_task_id INTEGER NOT NULL,
      phase TEXT NOT NULL,
      skill_used TEXT,
      input_context TEXT,
      output_result TEXT,
      test_output TEXT,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      elapsed_seconds INTEGER DEFAULT 0,
      success INTEGER DEFAULT 0,
      error TEXT,
      CHECK (phase IN ('spec_elicitation', 'red_phase', 'green_phase', 'refactor_phase', 'verification'))
    );

    CREATE TABLE IF NOT EXISTS tdd_test_results (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      tdd_task_id INTEGER NOT NULL,
      cycle_number INTEGER NOT NULL,
      phase TEXT NOT NULL,
      test_command TEXT,
      exit_code INTEGER,
      stdout TEXT,
      stderr TEXT,
      passed INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      skipped INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      CHECK (phase IN ('red', 'green', 'refactor'))
    );

    -- ============================================
    -- Agentic Dev Workflow Board Tables
    -- ============================================

    CREATE TABLE IF NOT EXISTS project_groups (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      name TEXT NOT NULL,
      description TEXT,
      is_default INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, name)
    );

    CREATE TABLE IF NOT EXISTS project_group_members (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      group_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      is_primary INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, group_id, project_id)
    );

    CREATE TABLE IF NOT EXISTS global_documents (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'general',
      tags TEXT,
      uploaded_by TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS agentic_tasks (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      phase TEXT NOT NULL DEFAULT 'idle',
      priority TEXT NOT NULL DEFAULT 'medium',
      project_group_id INTEGER,
      brainstorming_context TEXT,
      auto_advance INTEGER DEFAULT 1,
      error_handling TEXT DEFAULT 'smart_recovery',
      execution_strategy TEXT DEFAULT 'subagent_per_step',
      code_review_point TEXT DEFAULT 'before_verification',
      mcp_servers_config TEXT,
      verification_commands TEXT,
      reference_task_ids TEXT,
      total_input_tokens INTEGER DEFAULT 0,
      total_output_tokens INTEGER DEFAULT 0,
      total_cost_usd REAL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      CHECK (status IN ('todo', 'brainstorming', 'clarifying', 'planning', 'plan-review', 'in-progress', 'verifying', 'done')),
      CHECK (phase IN ('idle', 'todo', 'brainstorming', 'clarifying', 'awaiting_clarification', 'planning', 'plan_review', 'awaiting_plan_review', 'in_progress', 'executing', 'reviewing', 'verifying', 'creating_pr', 'awaiting_pr_review', 'merging', 'done', 'complete', 'failed', 'paused')),
      CHECK (error_handling IN ('stop_on_error', 'continue_on_error', 'smart_recovery')),
      CHECK (execution_strategy IN ('single_agent', 'subagent_per_step', 'batched_checkpoint')),
      CHECK (code_review_point IN ('never', 'after_step', 'after_batch', 'before_verification'))
    );

    CREATE TABLE IF NOT EXISTS agentic_task_documents (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      task_id INTEGER NOT NULL,
      document_type TEXT NOT NULL,
      document_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      CHECK (document_type IN ('global', 'uploaded', 'reference'))
    );

    CREATE TABLE IF NOT EXISTS agentic_task_uploads (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      task_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS agentic_clarifications (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      task_id INTEGER NOT NULL,
      question_text TEXT NOT NULL,
      question_type TEXT DEFAULT 'choice',
      suggested_options TEXT,
      user_answer TEXT,
      answer_type TEXT,
      answered_at TIMESTAMP,
      required INTEGER DEFAULT 1,
      order_index INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      CHECK (question_type IN ('text', 'choice', 'multi_choice', 'boolean'))
    );

    CREATE TABLE IF NOT EXISTS agentic_plans (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      task_id INTEGER NOT NULL,
      goal TEXT,
      architecture TEXT,
      tech_stack TEXT,
      plan_content TEXT NOT NULL,
      plan_steps TEXT NOT NULL,
      user_modified INTEGER DEFAULT 0,
      approved INTEGER DEFAULT 0,
      approved_at TIMESTAMP,
      version INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, task_id)
    );

    CREATE TABLE IF NOT EXISTS agentic_plan_steps (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      plan_id INTEGER NOT NULL,
      step_index INTEGER NOT NULL,
      step_content TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      output TEXT,
      error TEXT,
      review_status TEXT,
      review_notes TEXT,
      CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
      CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_changes') OR review_status IS NULL)
    );

    CREATE TABLE IF NOT EXISTS agentic_worktrees (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      task_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      worktree_path TEXT NOT NULL,
      branch_name TEXT NOT NULL,
      base_branch TEXT NOT NULL,
      status TEXT DEFAULT 'created',
      created_at TIMESTAMP DEFAULT NOW(),
      merged_at TIMESTAMP,
      deleted_at TIMESTAMP,
      UNIQUE(user_id, task_id, project_id),
      CHECK (status IN ('created', 'active', 'pr_created', 'merged', 'rolled_back', 'deleted'))
    );

    CREATE TABLE IF NOT EXISTS agentic_pull_requests (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      task_id INTEGER NOT NULL,
      pr_group_id TEXT NOT NULL,
      project_id INTEGER NOT NULL,
      worktree_id INTEGER NOT NULL,
      pr_number INTEGER,
      pr_url TEXT,
      pr_title TEXT,
      pr_body TEXT,
      pr_status TEXT DEFAULT 'draft',
      merged_at TIMESTAMP,
      rollback_branch TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      CHECK (pr_status IN ('draft', 'open', 'approved', 'merged', 'closed', 'rolled_back'))
    );

    CREATE TABLE IF NOT EXISTS agentic_verifications (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      task_id INTEGER NOT NULL,
      check_name TEXT NOT NULL,
      check_command TEXT NOT NULL,
      project_id INTEGER,
      status TEXT DEFAULT 'pending',
      exit_code INTEGER,
      stdout TEXT,
      stderr TEXT,
      duration_ms INTEGER,
      executed_at TIMESTAMP,
      CHECK (status IN ('pending', 'running', 'passed', 'failed', 'skipped'))
    );

    CREATE TABLE IF NOT EXISTS agentic_execution_logs (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      task_id INTEGER NOT NULL,
      phase TEXT NOT NULL,
      step_id INTEGER,
      log_type TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      CHECK (log_type IN ('info', 'progress', 'tool', 'error', 'success', 'warning'))
    );

    CREATE TABLE IF NOT EXISTS agentic_task_history (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      task_id INTEGER NOT NULL,
      archived_data TEXT NOT NULL,
      context_summary TEXT,
      final_status TEXT NOT NULL,
      pr_group_info TEXT,
      rollback_info TEXT,
      archived_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS slack_notification_config (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      project_group_id INTEGER,
      webhook_url TEXT NOT NULL,
      notify_phase_changes INTEGER DEFAULT 1,
      notify_user_action INTEGER DEFAULT 1,
      notify_completion INTEGER DEFAULT 1,
      notify_errors INTEGER DEFAULT 1,
      include_token_usage INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS board_visibility (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'test0',
      board_name TEXT NOT NULL,
      is_visible INTEGER DEFAULT 1,
      display_order INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, board_name)
    );

    -- ============================================
    -- Create Indexes
    -- ============================================

    CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_tasks_user_board ON tasks(user_id, board_id);
    CREATE INDEX IF NOT EXISTS idx_queue_user_status ON task_queue(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_task_documents_user_task ON task_documents(user_id, task_id);
    CREATE INDEX IF NOT EXISTS idx_project_documents_user_project ON project_documents(user_id, project_id);
    CREATE INDEX IF NOT EXISTS idx_presubmit_user_task ON presubmit_evaluations(user_id, task_id);
    CREATE INDEX IF NOT EXISTS idx_projects_user_active ON projects(user_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_projects_user_name ON projects(user_id, name);
    CREATE INDEX IF NOT EXISTS idx_token_usage_user_task ON token_usage(user_id, task_id);
    CREATE INDEX IF NOT EXISTS idx_workflows_user_status ON workflows(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_mcp_servers_user_active ON mcp_servers(user_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_boards_user_name ON boards(user_id, name);
    CREATE INDEX IF NOT EXISTS idx_comments_user_task ON comments(user_id, task_id);
    CREATE INDEX IF NOT EXISTS idx_labels_user_name ON labels(user_id, name);
    CREATE INDEX IF NOT EXISTS idx_webhook_events_user_type ON webhook_events(user_id, type);
    CREATE INDEX IF NOT EXISTS idx_automation_rules_user_enabled ON automation_rules(user_id, enabled);
    CREATE INDEX IF NOT EXISTS idx_tdd_tasks_user_status ON tdd_tasks(user_id, tdd_status);
    CREATE INDEX IF NOT EXISTS idx_external_skills_user_name ON external_skills(user_id, skill_name);
    CREATE INDEX IF NOT EXISTS idx_project_groups_user_name ON project_groups(user_id, name);
    CREATE INDEX IF NOT EXISTS idx_agentic_tasks_user_status ON agentic_tasks(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_agentic_tasks_user_phase ON agentic_tasks(user_id, phase);
    CREATE INDEX IF NOT EXISTS idx_agentic_clarifications_user_task ON agentic_clarifications(user_id, task_id);
    CREATE INDEX IF NOT EXISTS idx_agentic_plans_user_task ON agentic_plans(user_id, task_id);
    CREATE INDEX IF NOT EXISTS idx_agentic_logs_user_task ON agentic_execution_logs(user_id, task_id);
  `;

  try {
    await query(schema);
    console.log('[PostgreSQL] Schema initialized successfully');

    // Migration: Update agentic_tasks phase CHECK constraint to include all valid phases
    try {
      // Drop old constraint if it exists
      await query(`
        ALTER TABLE agentic_tasks DROP CONSTRAINT IF EXISTS agentic_tasks_phase_check
      `);
      // Add updated constraint with all valid phases
      await query(`
        ALTER TABLE agentic_tasks ADD CONSTRAINT agentic_tasks_phase_check 
        CHECK (phase IN ('idle', 'todo', 'brainstorming', 'clarifying', 'awaiting_clarification', 'planning', 'plan_review', 'awaiting_plan_review', 'in_progress', 'executing', 'reviewing', 'verifying', 'creating_pr', 'awaiting_pr_review', 'merging', 'done', 'complete', 'failed', 'paused'))
      `);
      console.log('[PostgreSQL] Updated agentic_tasks phase constraint');
    } catch (constraintError: any) {
      // Constraint might already be correct or table might not exist yet
      if (!constraintError.message?.includes('already exists')) {
        console.log('[PostgreSQL] Note: Phase constraint update skipped:', constraintError.message);
      }
    }

    // Migration: Update error_handling CHECK constraint
    try {
      await query(`
        ALTER TABLE agentic_tasks DROP CONSTRAINT IF EXISTS agentic_tasks_error_handling_check
      `);
      await query(`
        ALTER TABLE agentic_tasks ADD CONSTRAINT agentic_tasks_error_handling_check 
        CHECK (error_handling IN ('stop_on_error', 'continue_on_error', 'smart_recovery'))
      `);
      console.log('[PostgreSQL] Updated agentic_tasks error_handling constraint');
    } catch (constraintError: any) {
      if (!constraintError.message?.includes('already exists')) {
        console.log('[PostgreSQL] Note: Error handling constraint update skipped:', constraintError.message);
      }
    }

    // Insert default settings row if it doesn't exist
    await query(`
      INSERT INTO app_settings (id, user_id, demo_mode)
      VALUES (1, $1, 0)
      ON CONFLICT (id) DO NOTHING
    `, [DEFAULT_USER_ID]);

    // Insert default board visibility settings
    await query(`
      INSERT INTO board_visibility (user_id, board_name, is_visible, display_order) VALUES
        ($1, 'agentic-workflow-board', 1, 0),
        ($1, 'dev-board', 0, 1),
        ($1, 'tdd-board', 0, 2)
      ON CONFLICT (user_id, board_name) DO NOTHING
    `, [DEFAULT_USER_ID]);

    console.log('[PostgreSQL] Default data inserted');
  } catch (error) {
    console.error('[PostgreSQL] Schema initialization error:', error);
    throw error;
  }
}

// Exported database object for compatibility
export const db = {
  query,
  pool,
  DEFAULT_USER_ID,
};

// ============================================
// Prepared Statements (async)
// ============================================
export const statements = {
  // Task Operations
  createTask: {
    run: async (title: string, description: string, status: string, priority: string, boardId: string,
                referenceTaskIds: string | null, workflowIds: string | null, useContext7: number, useConfluence: number) => {
      const result = await query(
        `INSERT INTO tasks (user_id, title, description, status, priority, board_id, reference_task_ids, workflow_ids, use_context7, use_confluence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [DEFAULT_USER_ID, title, description, status, priority, boardId, referenceTaskIds, workflowIds, useContext7, useConfluence]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getTask: {
    get: async (id: number) => {
      const result = await query('SELECT * FROM tasks WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  getAllTasks: {
    all: async () => {
      const result = await query('SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  getTasksByBoard: {
    all: async (boardId: string) => {
      const result = await query('SELECT * FROM tasks WHERE user_id = $1 AND board_id = $2 ORDER BY created_at DESC', [DEFAULT_USER_ID, boardId]);
      return result.rows;
    }
  },

  updateTaskStatus: {
    run: async (status: string, id: number) => {
      await query('UPDATE tasks SET status = $1, updated_at = NOW() WHERE user_id = $2 AND id = $3', [status, DEFAULT_USER_ID, id]);
    }
  },

  deleteTask: {
    run: async (id: number) => {
      await query('DELETE FROM tasks WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  // Workflow Operations
  createWorkflow: {
    run: async (id: string, name: string, description: string, framework: string, nlInput: string,
                yamlDefinition: string, commandFile: string, category: string, status: string, version: number, tags: string, icon: string) => {
      await query(
        `INSERT INTO workflows (id, user_id, name, description, framework, nl_input, yaml_definition, command_file, category, status, version, tags, icon)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [id, DEFAULT_USER_ID, name, description, framework, nlInput, yamlDefinition, commandFile, category, status, version, tags, icon]
      );
    }
  },

  getAllWorkflows: {
    all: async () => {
      const result = await query('SELECT * FROM workflows WHERE user_id = $1 ORDER BY created_at DESC', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  getWorkflow: {
    get: async (id: string) => {
      const result = await query('SELECT * FROM workflows WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  getWorkflowByName: {
    get: async (name: string) => {
      const result = await query('SELECT * FROM workflows WHERE user_id = $1 AND name = $2', [DEFAULT_USER_ID, name]);
      return result.rows[0];
    }
  },

  updateWorkflow: {
    run: async (description: string, yamlDefinition: string, commandFile: string, category: string, status: string, tags: string, id: string) => {
      await query(
        `UPDATE workflows
         SET description = $1, yaml_definition = $2, command_file = $3, category = $4, status = $5, version = version + 1, tags = $6, updated_at = NOW()
         WHERE user_id = $7 AND id = $8`,
        [description, yamlDefinition, commandFile, category, status, tags, DEFAULT_USER_ID, id]
      );
    }
  },

  deleteWorkflow: {
    run: async (id: string) => {
      await query('DELETE FROM workflows WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  createExecution: {
    run: async (id: string, workflowId: string, status: string) => {
      await query(
        `INSERT INTO workflow_executions (id, user_id, workflow_id, status, start_time)
         VALUES ($1, $2, $3, $4, NOW())`,
        [id, DEFAULT_USER_ID, workflowId, status]
      );
    }
  },

  updateExecution: {
    run: async (status: string, result: string, logs: string, error: string, duration: number, id: string) => {
      await query(
        `UPDATE workflow_executions
         SET status = $1, result = $2, logs = $3, error = $4, end_time = NOW(), duration = $5
         WHERE user_id = $6 AND id = $7`,
        [status, result, logs, error, duration, DEFAULT_USER_ID, id]
      );
    }
  },

  getExecutionsByWorkflow: {
    all: async (workflowId: string) => {
      const result = await query(
        'SELECT * FROM workflow_executions WHERE user_id = $1 AND workflow_id = $2 ORDER BY start_time DESC',
        [DEFAULT_USER_ID, workflowId]
      );
      return result.rows;
    }
  },

  // Task Questions
  addQuestion: {
    run: async (taskId: number, question: string) => {
      await query(
        'INSERT INTO task_questions (user_id, task_id, question) VALUES ($1, $2, $3)',
        [DEFAULT_USER_ID, taskId, question]
      );
    }
  },

  answerQuestion: {
    run: async (answer: string, id: number) => {
      await query('UPDATE task_questions SET answer = $1 WHERE user_id = $2 AND id = $3', [answer, DEFAULT_USER_ID, id]);
    }
  },

  getQuestions: {
    all: async (taskId: number) => {
      const result = await query(
        'SELECT * FROM task_questions WHERE user_id = $1 AND task_id = $2 ORDER BY created_at',
        [DEFAULT_USER_ID, taskId]
      );
      return result.rows;
    }
  },

  // Prompts
  createPrompt: {
    run: async (taskId: number, originalDescription: string) => {
      await query(
        'INSERT INTO task_prompts (user_id, task_id, original_description) VALUES ($1, $2, $3)',
        [DEFAULT_USER_ID, taskId, originalDescription]
      );
    }
  },

  updatePrompt: {
    run: async (enhancedPrompt: string, taskId: number) => {
      await query(
        `UPDATE task_prompts
         SET enhanced_prompt = $1, status = 'completed', updated_at = NOW()
         WHERE user_id = $2 AND task_id = $3`,
        [enhancedPrompt, DEFAULT_USER_ID, taskId]
      );
    }
  },

  approvePrompt: {
    run: async (taskId: number) => {
      await query(
        `UPDATE task_prompts
         SET approved = 1, approved_at = NOW(), updated_at = NOW()
         WHERE user_id = $1 AND task_id = $2`,
        [DEFAULT_USER_ID, taskId]
      );
    }
  },

  setPromptRefinementStatus: {
    run: async (refinementStatus: string, taskId: number) => {
      await query(
        `UPDATE task_prompts
         SET refinement_status = $1, updated_at = NOW()
         WHERE user_id = $2 AND task_id = $3`,
        [refinementStatus, DEFAULT_USER_ID, taskId]
      );
    }
  },

  resetPromptApproval: {
    run: async (taskId: number) => {
      await query(
        `UPDATE task_prompts
         SET approved = 0, approved_at = NULL, updated_at = NOW()
         WHERE user_id = $1 AND task_id = $2`,
        [DEFAULT_USER_ID, taskId]
      );
    }
  },

  getPrompt: {
    get: async (taskId: number) => {
      const result = await query(
        'SELECT * FROM task_prompts WHERE user_id = $1 AND task_id = $2 ORDER BY created_at DESC LIMIT 1',
        [DEFAULT_USER_ID, taskId]
      );
      return result.rows[0];
    }
  },

  // Queue
  enqueueTask: {
    run: async (taskId: number) => {
      await query(
        `INSERT INTO task_queue (user_id, task_id, status) VALUES ($1, $2, 'pending')`,
        [DEFAULT_USER_ID, taskId]
      );
    }
  },

  getPendingQueueItems: {
    all: async () => {
      const result = await query(
        `SELECT * FROM task_queue WHERE user_id = $1 AND status = 'pending' ORDER BY created_at LIMIT 10`,
        [DEFAULT_USER_ID]
      );
      return result.rows;
    }
  },

  getQueueItemByTaskId: {
    get: async (taskId: number) => {
      const result = await query(
        `SELECT * FROM task_queue WHERE user_id = $1 AND task_id = $2 ORDER BY created_at DESC LIMIT 1`,
        [DEFAULT_USER_ID, taskId]
      );
      return result.rows[0];
    }
  },

  updateQueueStatus: {
    run: async (status: string, error: string | null, id: number) => {
      await query(
        `UPDATE task_queue SET status = $1, processed_at = NOW(), error = $2 WHERE user_id = $3 AND id = $4`,
        [status, error, DEFAULT_USER_ID, id]
      );
    }
  },

  cancelQueueItemsForTask: {
    run: async (taskId: number) => {
      await query(
        `UPDATE task_queue SET status = 'cancelled', processed_at = NOW() WHERE user_id = $1 AND task_id = $2 AND status = 'pending'`,
        [DEFAULT_USER_ID, taskId]
      );
    }
  },

  // Implementation tracking
  createImplementation: {
    run: async (taskId: number, status: string, gitRestorePoint: string | null, priority: string | null) => {
      await query(
        `INSERT INTO task_implementation (user_id, task_id, status, git_restore_point, priority)
         VALUES ($1, $2, $3, $4, $5)`,
        [DEFAULT_USER_ID, taskId, status, gitRestorePoint, priority]
      );
    }
  },

  getImplementation: {
    get: async (taskId: number) => {
      const result = await query('SELECT * FROM task_implementation WHERE user_id = $1 AND task_id = $2', [DEFAULT_USER_ID, taskId]);
      return result.rows[0];
    }
  },

  updateImplementationStatus: {
    run: async (status: string, taskId: number) => {
      await query(
        `UPDATE task_implementation SET status = $1, updated_at = NOW() WHERE user_id = $2 AND task_id = $3`,
        [status, DEFAULT_USER_ID, taskId]
      );
    }
  },

  startImplementation: {
    run: async (taskId: number) => {
      await query(
        `UPDATE task_implementation SET status = 'running', started_at = NOW(), updated_at = NOW() WHERE user_id = $1 AND task_id = $2`,
        [DEFAULT_USER_ID, taskId]
      );
    }
  },

  completeImplementation: {
    run: async (elapsedSeconds: number, gitCommitHash: string | null, taskId: number) => {
      await query(
        `UPDATE task_implementation
         SET status = 'completed', completed_at = NOW(), elapsed_seconds = $1, git_commit_hash = $2, updated_at = NOW()
         WHERE user_id = $3 AND task_id = $4`,
        [elapsedSeconds, gitCommitHash, DEFAULT_USER_ID, taskId]
      );
    }
  },

  getActiveImplementation: {
    get: async () => {
      const result = await query(
        `SELECT * FROM task_implementation WHERE user_id = $1 AND status = 'running' LIMIT 1`,
        [DEFAULT_USER_ID]
      );
      return result.rows[0];
    }
  },

  getWaitingImplementations: {
    all: async () => {
      const result = await query(
        `SELECT ti.* FROM task_implementation ti
         JOIN tasks t ON ti.task_id = t.id AND ti.user_id = t.user_id
         WHERE ti.user_id = $1 AND ti.status = 'waiting'
         ORDER BY
           CASE COALESCE(ti.priority, t.priority)
             WHEN 'urgent' THEN 1
             WHEN 'high' THEN 2
             WHEN 'medium' THEN 3
             WHEN 'low' THEN 4
             ELSE 5
           END,
           ti.created_at ASC`,
        [DEFAULT_USER_ID]
      );
      return result.rows;
    }
  },

  updateImplementationRefinement: {
    run: async (refinementStatus: string, refinementRound: number, refinementFeedback: string | null, taskId: number) => {
      await query(
        `UPDATE task_implementation
         SET refinement_status = $1, refinement_round = $2, refinement_feedback = $3, updated_at = NOW()
         WHERE user_id = $4 AND task_id = $5`,
        [refinementStatus, refinementRound, refinementFeedback, DEFAULT_USER_ID, taskId]
      );
    }
  },

  // Document operations
  createDocument: {
    run: async (taskId: number, filename: string, originalFilename: string, filePath: string,
                fileSize: number, mimeType: string, url: string | null, uploadedBy: string | null, description: string | null) => {
      const result = await query(
        `INSERT INTO task_documents (user_id, task_id, filename, original_filename, file_path, file_size, mime_type, url, uploaded_by, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [DEFAULT_USER_ID, taskId, filename, originalFilename, filePath, fileSize, mimeType, url, uploadedBy, description]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getTaskDocuments: {
    all: async (taskId: number) => {
      const result = await query(
        'SELECT * FROM task_documents WHERE user_id = $1 AND task_id = $2 ORDER BY uploaded_at DESC',
        [DEFAULT_USER_ID, taskId]
      );
      return result.rows;
    }
  },

  getDocument: {
    get: async (id: number) => {
      const result = await query('SELECT * FROM task_documents WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  deleteDocument: {
    run: async (id: number) => {
      await query('DELETE FROM task_documents WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  updateDocumentDescription: {
    run: async (description: string, id: number) => {
      await query('UPDATE task_documents SET description = $1 WHERE user_id = $2 AND id = $3', [description, DEFAULT_USER_ID, id]);
    }
  },

  // Project document operations
  createProjectDocument: {
    run: async (projectId: string, filename: string, originalFilename: string, filePath: string,
                fileSize: number, mimeType: string, url: string | null, uploadedBy: string | null,
                description: string | null, category: string | null, tags: string | null) => {
      const result = await query(
        `INSERT INTO project_documents (user_id, project_id, filename, original_filename, file_path, file_size, mime_type, url, uploaded_by, description, category, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [DEFAULT_USER_ID, projectId, filename, originalFilename, filePath, fileSize, mimeType, url, uploadedBy, description, category, tags]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getProjectDocuments: {
    all: async (projectId: string) => {
      const result = await query(
        'SELECT * FROM project_documents WHERE user_id = $1 AND project_id = $2 ORDER BY uploaded_at DESC',
        [DEFAULT_USER_ID, projectId]
      );
      return result.rows;
    }
  },

  getProjectDocument: {
    get: async (id: number) => {
      const result = await query('SELECT * FROM project_documents WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  deleteProjectDocument: {
    run: async (id: number) => {
      await query('DELETE FROM project_documents WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  updateProjectDocumentDescription: {
    run: async (description: string, id: number) => {
      await query('UPDATE project_documents SET description = $1, updated_at = NOW() WHERE user_id = $2 AND id = $3', [description, DEFAULT_USER_ID, id]);
    }
  },

  updateProjectDocumentCategory: {
    run: async (category: string, id: number) => {
      await query('UPDATE project_documents SET category = $1, updated_at = NOW() WHERE user_id = $2 AND id = $3', [category, DEFAULT_USER_ID, id]);
    }
  },

  updateProjectDocumentTags: {
    run: async (tags: string, id: number) => {
      await query('UPDATE project_documents SET tags = $1, updated_at = NOW() WHERE user_id = $2 AND id = $3', [tags, DEFAULT_USER_ID, id]);
    }
  },

  // Implementation report operations
  saveImplementationReport: {
    run: async (report: string, taskId: number) => {
      await query(
        `UPDATE task_implementation
         SET implementation_report = $1, report_status = 'completed', report_generated_at = NOW(), updated_at = NOW()
         WHERE user_id = $2 AND task_id = $3`,
        [report, DEFAULT_USER_ID, taskId]
      );
    }
  },

  updateReportStatus: {
    run: async (reportStatus: string, taskId: number) => {
      await query(
        `UPDATE task_implementation SET report_status = $1, updated_at = NOW() WHERE user_id = $2 AND task_id = $3`,
        [reportStatus, DEFAULT_USER_ID, taskId]
      );
    }
  },

  // Presubmit evaluation operations
  createPresubmitEvaluation: {
    run: async (taskId: number, expertRole: string) => {
      await query(
        `INSERT INTO presubmit_evaluations (user_id, task_id, expert_role, status) VALUES ($1, $2, $3, 'pending')`,
        [DEFAULT_USER_ID, taskId, expertRole]
      );
    }
  },

  getPresubmitEvaluations: {
    all: async (taskId: number) => {
      const result = await query(
        'SELECT * FROM presubmit_evaluations WHERE user_id = $1 AND task_id = $2 ORDER BY expert_role',
        [DEFAULT_USER_ID, taskId]
      );
      return result.rows;
    }
  },

  getPresubmitEvaluation: {
    get: async (taskId: number, expertRole: string) => {
      const result = await query(
        'SELECT * FROM presubmit_evaluations WHERE user_id = $1 AND task_id = $2 AND expert_role = $3',
        [DEFAULT_USER_ID, taskId, expertRole]
      );
      return result.rows[0];
    }
  },

  startPresubmitEvaluation: {
    run: async (taskId: number, expertRole: string) => {
      await query(
        `UPDATE presubmit_evaluations SET status = 'running', started_at = NOW(), updated_at = NOW()
         WHERE user_id = $1 AND task_id = $2 AND expert_role = $3`,
        [DEFAULT_USER_ID, taskId, expertRole]
      );
    }
  },

  completePresubmitEvaluation: {
    run: async (elapsedSeconds: number, evaluationReport: string, actionPoints: string,
                overallOpinion: string, severity: string, taskId: number, expertRole: string) => {
      await query(
        `UPDATE presubmit_evaluations
         SET status = 'completed', completed_at = NOW(), elapsed_seconds = $1, evaluation_report = $2,
             action_points = $3, overall_opinion = $4, severity = $5, updated_at = NOW()
         WHERE user_id = $6 AND task_id = $7 AND expert_role = $8`,
        [elapsedSeconds, evaluationReport, actionPoints, overallOpinion, severity, DEFAULT_USER_ID, taskId, expertRole]
      );
    }
  },

  failPresubmitEvaluation: {
    run: async (error: string, taskId: number, expertRole: string) => {
      await query(
        `UPDATE presubmit_evaluations SET status = 'error', error = $1, updated_at = NOW()
         WHERE user_id = $2 AND task_id = $3 AND expert_role = $4`,
        [error, DEFAULT_USER_ID, taskId, expertRole]
      );
    }
  },

  // Team ruleset operations
  createTeamRuleset: {
    run: async (name: string, description: string, version: string, body: string,
                whenApply: string, resources: string, dependencies: string) => {
      const result = await query(
        `INSERT INTO team_rulesets (user_id, name, description, version, body, when_apply, resources, dependencies)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [DEFAULT_USER_ID, name, description, version, body, whenApply, resources, dependencies]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getAllTeamRulesets: {
    all: async () => {
      const result = await query('SELECT * FROM team_rulesets WHERE user_id = $1 ORDER BY updated_at DESC', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  getTeamRuleset: {
    get: async (id: number) => {
      const result = await query('SELECT * FROM team_rulesets WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  getTeamRulesetByName: {
    get: async (name: string) => {
      const result = await query('SELECT * FROM team_rulesets WHERE user_id = $1 AND name = $2', [DEFAULT_USER_ID, name]);
      return result.rows[0];
    }
  },

  updateTeamRuleset: {
    run: async (name: string, description: string, version: string, body: string,
                whenApply: string, resources: string, dependencies: string, id: number) => {
      await query(
        `UPDATE team_rulesets
         SET name = $1, description = $2, version = $3, body = $4, when_apply = $5,
             resources = $6, dependencies = $7, updated_at = NOW()
         WHERE user_id = $8 AND id = $9`,
        [name, description, version, body, whenApply, resources, dependencies, DEFAULT_USER_ID, id]
      );
    }
  },

  deleteTeamRuleset: {
    run: async (id: number) => {
      await query('DELETE FROM team_rulesets WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  toggleTeamRuleset: {
    run: async (id: number) => {
      await query(
        `UPDATE team_rulesets SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END, updated_at = NOW()
         WHERE user_id = $1 AND id = $2`,
        [DEFAULT_USER_ID, id]
      );
    }
  },

  getEnabledTeamRulesets: {
    all: async () => {
      const result = await query('SELECT * FROM team_rulesets WHERE user_id = $1 AND enabled = 1 ORDER BY name', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  // App settings operations
  getAppSettings: {
    get: async () => {
      const result = await query('SELECT * FROM app_settings WHERE user_id = $1 AND id = 1', [DEFAULT_USER_ID]);
      return result.rows[0];
    }
  },

  updateDemoMode: {
    run: async (demoMode: number) => {
      await query('UPDATE app_settings SET demo_mode = $1, updated_at = NOW() WHERE user_id = $2 AND id = 1', [demoMode, DEFAULT_USER_ID]);
    }
  },

  updateApiKey: {
    run: async (apiKey: string) => {
      await query('UPDATE app_settings SET anthropic_api_key = $1, updated_at = NOW() WHERE user_id = $2 AND id = 1', [apiKey, DEFAULT_USER_ID]);
    }
  },

  updateOpenAiApiKey: {
    run: async (apiKey: string) => {
      await query('UPDATE app_settings SET openai_api_key = $1, updated_at = NOW() WHERE user_id = $2 AND id = 1', [apiKey, DEFAULT_USER_ID]);
    }
  },

  updateGitHubToken: {
    run: async (token: string) => {
      await query('UPDATE app_settings SET github_token = $1, updated_at = NOW() WHERE user_id = $2 AND id = 1', [token, DEFAULT_USER_ID]);
    }
  },

  updateContext7ApiKey: {
    run: async (apiKey: string) => {
      await query('UPDATE app_settings SET context7_api_key = $1, updated_at = NOW() WHERE user_id = $2 AND id = 1', [apiKey, DEFAULT_USER_ID]);
    }
  },

  updateCustomization: {
    run: async (boardName: string, sidebarTitle: string) => {
      await query(
        'UPDATE app_settings SET board_name = $1, sidebar_title = $2, updated_at = NOW() WHERE user_id = $3 AND id = 1',
        [boardName, sidebarTitle, DEFAULT_USER_ID]
      );
    }
  },

  // Project management operations
  createProject: {
    run: async (name: string, description: string | null, gitRemoteUrl: string, gitBranch: string, localPath: string, cloneStatus: string) => {
      const result = await query(
        `INSERT INTO projects (user_id, name, description, git_remote_url, git_branch, local_path, clone_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [DEFAULT_USER_ID, name, description, gitRemoteUrl, gitBranch, localPath, cloneStatus]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getProject: {
    get: async (id: number) => {
      const result = await query('SELECT * FROM projects WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  getProjectByName: {
    get: async (name: string) => {
      const result = await query('SELECT * FROM projects WHERE user_id = $1 AND name = $2', [DEFAULT_USER_ID, name]);
      return result.rows[0];
    }
  },

  getAllProjects: {
    all: async () => {
      const result = await query('SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  getActiveProject: {
    get: async () => {
      const result = await query('SELECT * FROM projects WHERE user_id = $1 AND is_active = 1 LIMIT 1', [DEFAULT_USER_ID]);
      return result.rows[0];
    }
  },

  activateProject: {
    run: async (id: number) => {
      // Deactivate all first, then activate this one
      await query('UPDATE projects SET is_active = 0, updated_at = NOW() WHERE user_id = $1', [DEFAULT_USER_ID]);
      await query('UPDATE projects SET is_active = 1, updated_at = NOW() WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  deactivateAllProjects: {
    run: async () => {
      await query('UPDATE projects SET is_active = 0, updated_at = NOW() WHERE user_id = $1', [DEFAULT_USER_ID]);
    }
  },

  updateProjectStatus: {
    run: async (cloneStatus: string, cloneError: string | null, id: number) => {
      await query(
        'UPDATE projects SET clone_status = $1, clone_error = $2, updated_at = NOW() WHERE user_id = $3 AND id = $4',
        [cloneStatus, cloneError, DEFAULT_USER_ID, id]
      );
    }
  },

  updateProjectInfo: {
    run: async (framework: string | null, language: string | null, packageManager: string | null,
                gitLastCommit: string | null, cloneStatus: string, cloneError: string | null, id: number) => {
      await query(
        `UPDATE projects
         SET framework = $1, language = $2, package_manager = $3, git_last_commit = $4,
             clone_status = $5, clone_error = $6, updated_at = NOW()
         WHERE user_id = $7 AND id = $8`,
        [framework, language, packageManager, gitLastCommit, cloneStatus, cloneError, DEFAULT_USER_ID, id]
      );
    }
  },

  updateProjectGitInfo: {
    run: async (gitLastCommit: string, id: number) => {
      await query(
        'UPDATE projects SET git_last_commit = $1, git_last_pull = NOW(), updated_at = NOW() WHERE user_id = $2 AND id = $3',
        [gitLastCommit, DEFAULT_USER_ID, id]
      );
    }
  },

  deleteProject: {
    run: async (id: number) => {
      await query('DELETE FROM projects WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  // MCP Server operations
  createMcpServer: {
    run: async (serverName: string, description: string | null, version: string | null,
                serverAddress: string | null, port: number | null, protocolType: string,
                connectionPath: string | null, authType: string, authToken: string | null,
                authKeyName: string | null, additionalHeaders: string | null,
                serverArgs: string | null, serverEnv: string | null) => {
      const result = await query(
        `INSERT INTO mcp_servers (user_id, server_name, description, version, server_address, port, protocol_type,
                                  connection_path, auth_type, auth_token, auth_key_name, additional_headers, server_args, server_env)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id`,
        [DEFAULT_USER_ID, serverName, description, version, serverAddress, port, protocolType,
         connectionPath, authType, authToken, authKeyName, additionalHeaders, serverArgs, serverEnv]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getMcpServer: {
    get: async (id: number) => {
      const result = await query('SELECT * FROM mcp_servers WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  getMcpServerByName: {
    get: async (serverName: string) => {
      const result = await query('SELECT * FROM mcp_servers WHERE user_id = $1 AND server_name = $2', [DEFAULT_USER_ID, serverName]);
      return result.rows[0];
    }
  },

  getAllMcpServers: {
    all: async () => {
      const result = await query('SELECT * FROM mcp_servers WHERE user_id = $1 ORDER BY created_at DESC', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  getActiveMcpServers: {
    all: async () => {
      const result = await query('SELECT * FROM mcp_servers WHERE user_id = $1 AND is_active = 1 ORDER BY server_name', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  updateMcpServer: {
    run: async (serverName: string, description: string | null, version: string | null,
                serverAddress: string | null, port: number | null, protocolType: string,
                connectionPath: string | null, authType: string, authToken: string | null,
                authKeyName: string | null, additionalHeaders: string | null,
                serverArgs: string | null, serverEnv: string | null, id: number) => {
      await query(
        `UPDATE mcp_servers
         SET server_name = $1, description = $2, version = $3, server_address = $4,
             port = $5, protocol_type = $6, connection_path = $7, auth_type = $8,
             auth_token = $9, auth_key_name = $10, additional_headers = $11,
             server_args = $12, server_env = $13, updated_at = NOW()
         WHERE user_id = $14 AND id = $15`,
        [serverName, description, version, serverAddress, port, protocolType, connectionPath,
         authType, authToken, authKeyName, additionalHeaders, serverArgs, serverEnv, DEFAULT_USER_ID, id]
      );
    }
  },

  updateMcpServerTestResult: {
    run: async (lastTestStatus: string, lastTestError: string | null, availableTools: string | null, id: number) => {
      await query(
        `UPDATE mcp_servers
         SET last_test_at = NOW(), last_test_status = $1, last_test_error = $2, available_tools = $3, updated_at = NOW()
         WHERE user_id = $4 AND id = $5`,
        [lastTestStatus, lastTestError, availableTools, DEFAULT_USER_ID, id]
      );
    }
  },

  toggleMcpServerActive: {
    run: async (id: number) => {
      await query(
        `UPDATE mcp_servers SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END, updated_at = NOW()
         WHERE user_id = $1 AND id = $2`,
        [DEFAULT_USER_ID, id]
      );
    }
  },

  deleteMcpServer: {
    run: async (id: number) => {
      await query('DELETE FROM mcp_servers WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  // Boards operations
  createBoard: {
    run: async (id: string, name: string, description: string | null, columns: string) => {
      await query(
        'INSERT INTO boards (id, user_id, name, description, columns) VALUES ($1, $2, $3, $4, $5)',
        [id, DEFAULT_USER_ID, name, description, columns]
      );
    }
  },

  getAllBoards: {
    all: async () => {
      const result = await query('SELECT * FROM boards WHERE user_id = $1 ORDER BY created_at DESC', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  getBoard: {
    get: async (id: string) => {
      const result = await query('SELECT * FROM boards WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  updateBoard: {
    run: async (name: string, description: string | null, columns: string, id: string) => {
      await query(
        'UPDATE boards SET name = $1, description = $2, columns = $3, updated_at = NOW() WHERE user_id = $4 AND id = $5',
        [name, description, columns, DEFAULT_USER_ID, id]
      );
    }
  },

  deleteBoard: {
    run: async (id: string) => {
      await query('DELETE FROM boards WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  // Comments operations
  createComment: {
    run: async (id: string, taskId: number, author: string, content: string) => {
      await query(
        'INSERT INTO comments (id, user_id, task_id, author, content) VALUES ($1, $2, $3, $4, $5)',
        [id, DEFAULT_USER_ID, taskId, author, content]
      );
    }
  },

  getCommentsByTask: {
    all: async (taskId: number) => {
      const result = await query(
        'SELECT * FROM comments WHERE user_id = $1 AND task_id = $2 ORDER BY created_at ASC',
        [DEFAULT_USER_ID, taskId]
      );
      return result.rows;
    }
  },

  getComment: {
    get: async (id: string) => {
      const result = await query('SELECT * FROM comments WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  updateComment: {
    run: async (content: string, id: string) => {
      await query('UPDATE comments SET content = $1, updated_at = NOW() WHERE user_id = $2 AND id = $3', [content, DEFAULT_USER_ID, id]);
    }
  },

  deleteComment: {
    run: async (id: string) => {
      await query('DELETE FROM comments WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  deleteCommentsByTask: {
    run: async (taskId: number) => {
      await query('DELETE FROM comments WHERE user_id = $1 AND task_id = $2', [DEFAULT_USER_ID, taskId]);
    }
  },

  // Labels operations
  createLabel: {
    run: async (id: string, name: string, color: string, description: string | null) => {
      await query(
        'INSERT INTO labels (id, user_id, name, color, description) VALUES ($1, $2, $3, $4, $5)',
        [id, DEFAULT_USER_ID, name, color, description]
      );
    }
  },

  getAllLabels: {
    all: async () => {
      const result = await query('SELECT * FROM labels WHERE user_id = $1 ORDER BY name', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  getLabel: {
    get: async (id: string) => {
      const result = await query('SELECT * FROM labels WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  getLabelByName: {
    get: async (name: string) => {
      const result = await query('SELECT * FROM labels WHERE user_id = $1 AND name = $2', [DEFAULT_USER_ID, name]);
      return result.rows[0];
    }
  },

  updateLabel: {
    run: async (name: string, color: string, description: string | null, id: string) => {
      await query(
        'UPDATE labels SET name = $1, color = $2, description = $3, updated_at = NOW() WHERE user_id = $4 AND id = $5',
        [name, color, description, DEFAULT_USER_ID, id]
      );
    }
  },

  deleteLabel: {
    run: async (id: string) => {
      await query('DELETE FROM labels WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  // Task-Label relationship operations
  addTaskLabel: {
    run: async (taskId: number, labelId: string) => {
      await query(
        'INSERT INTO task_labels (user_id, task_id, label_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [DEFAULT_USER_ID, taskId, labelId]
      );
    }
  },

  removeTaskLabel: {
    run: async (taskId: number, labelId: string) => {
      await query('DELETE FROM task_labels WHERE user_id = $1 AND task_id = $2 AND label_id = $3', [DEFAULT_USER_ID, taskId, labelId]);
    }
  },

  getTaskLabels: {
    all: async (taskId: number) => {
      const result = await query(
        `SELECT l.* FROM labels l
         INNER JOIN task_labels tl ON l.id = tl.label_id AND l.user_id = tl.user_id
         WHERE tl.user_id = $1 AND tl.task_id = $2
         ORDER BY l.name`,
        [DEFAULT_USER_ID, taskId]
      );
      return result.rows;
    }
  },

  getTasksByLabel: {
    all: async (labelId: string) => {
      const result = await query(
        `SELECT t.* FROM tasks t
         INNER JOIN task_labels tl ON t.id = tl.task_id AND t.user_id = tl.user_id
         WHERE tl.user_id = $1 AND tl.label_id = $2
         ORDER BY t.created_at DESC`,
        [DEFAULT_USER_ID, labelId]
      );
      return result.rows;
    }
  },

  // Webhook Events operations
  createWebhookEvent: {
    run: async (id: string, type: string, source: string, payload: string, taskId: number | null) => {
      await query(
        'INSERT INTO webhook_events (id, user_id, type, source, payload, task_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, DEFAULT_USER_ID, type, source, payload, taskId]
      );
    }
  },

  getAllWebhookEvents: {
    all: async () => {
      const result = await query(
        'SELECT * FROM webhook_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
        [DEFAULT_USER_ID]
      );
      return result.rows;
    }
  },

  getWebhookEvent: {
    get: async (id: string) => {
      const result = await query('SELECT * FROM webhook_events WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  getUnprocessedWebhookEvents: {
    all: async () => {
      const result = await query(
        'SELECT * FROM webhook_events WHERE user_id = $1 AND processed = 0 ORDER BY created_at ASC',
        [DEFAULT_USER_ID]
      );
      return result.rows;
    }
  },

  markWebhookEventProcessed: {
    run: async (id: string) => {
      await query(
        'UPDATE webhook_events SET processed = 1, processed_at = NOW() WHERE user_id = $1 AND id = $2',
        [DEFAULT_USER_ID, id]
      );
    }
  },

  markWebhookEventError: {
    run: async (error: string, id: string) => {
      await query(
        'UPDATE webhook_events SET processed = 1, processed_at = NOW(), error = $1 WHERE user_id = $2 AND id = $3',
        [error, DEFAULT_USER_ID, id]
      );
    }
  },

  deleteWebhookEvent: {
    run: async (id: string) => {
      await query('DELETE FROM webhook_events WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  // Automation Rules operations
  createAutomationRule: {
    run: async (id: string, name: string, enabled: number, triggerType: string, triggerConfig: string,
                actionType: string, actionConfig: string, priority: number, description: string | null) => {
      await query(
        `INSERT INTO automation_rules (id, user_id, name, enabled, trigger_type, trigger_config, action_type, action_config, priority, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, DEFAULT_USER_ID, name, enabled, triggerType, triggerConfig, actionType, actionConfig, priority, description]
      );
    }
  },

  getAllAutomationRules: {
    all: async () => {
      const result = await query(
        'SELECT * FROM automation_rules WHERE user_id = $1 ORDER BY priority DESC, name',
        [DEFAULT_USER_ID]
      );
      return result.rows;
    }
  },

  getAutomationRule: {
    get: async (id: string) => {
      const result = await query('SELECT * FROM automation_rules WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  getEnabledAutomationRules: {
    all: async () => {
      const result = await query(
        'SELECT * FROM automation_rules WHERE user_id = $1 AND enabled = 1 ORDER BY priority DESC',
        [DEFAULT_USER_ID]
      );
      return result.rows;
    }
  },

  getAutomationRulesByTrigger: {
    all: async (triggerType: string) => {
      const result = await query(
        'SELECT * FROM automation_rules WHERE user_id = $1 AND enabled = 1 AND trigger_type = $2 ORDER BY priority DESC',
        [DEFAULT_USER_ID, triggerType]
      );
      return result.rows;
    }
  },

  updateAutomationRule: {
    run: async (name: string, enabled: number, triggerType: string, triggerConfig: string,
                actionType: string, actionConfig: string, priority: number, description: string | null, id: string) => {
      await query(
        `UPDATE automation_rules
         SET name = $1, enabled = $2, trigger_type = $3, trigger_config = $4,
             action_type = $5, action_config = $6, priority = $7, description = $8, updated_at = NOW()
         WHERE user_id = $9 AND id = $10`,
        [name, enabled, triggerType, triggerConfig, actionType, actionConfig, priority, description, DEFAULT_USER_ID, id]
      );
    }
  },

  toggleAutomationRule: {
    run: async (id: string) => {
      await query(
        `UPDATE automation_rules SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END, updated_at = NOW()
         WHERE user_id = $1 AND id = $2`,
        [DEFAULT_USER_ID, id]
      );
    }
  },

  incrementAutomationRuleTriggerCount: {
    run: async (id: string) => {
      await query(
        'UPDATE automation_rules SET trigger_count = trigger_count + 1, last_triggered_at = NOW() WHERE user_id = $1 AND id = $2',
        [DEFAULT_USER_ID, id]
      );
    }
  },

  deleteAutomationRule: {
    run: async (id: string) => {
      await query('DELETE FROM automation_rules WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  // Integration Configs operations
  createOrUpdateIntegrationConfig: {
    run: async (integrationType: string, config: string, isActive: number) => {
      await query(
        `INSERT INTO integration_configs (user_id, integration_type, config, is_active)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, integration_type) DO UPDATE SET
           config = EXCLUDED.config,
           is_active = EXCLUDED.is_active,
           updated_at = NOW()`,
        [DEFAULT_USER_ID, integrationType, config, isActive]
      );
    }
  },

  getIntegrationConfig: {
    get: async (integrationType: string) => {
      const result = await query(
        'SELECT * FROM integration_configs WHERE user_id = $1 AND integration_type = $2',
        [DEFAULT_USER_ID, integrationType]
      );
      return result.rows[0];
    }
  },

  getAllIntegrationConfigs: {
    all: async () => {
      const result = await query('SELECT * FROM integration_configs WHERE user_id = $1 ORDER BY integration_type', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  getActiveIntegrationConfigs: {
    all: async () => {
      const result = await query('SELECT * FROM integration_configs WHERE user_id = $1 AND is_active = 1', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  updateIntegrationSync: {
    run: async (integrationType: string) => {
      await query(
        'UPDATE integration_configs SET last_sync_at = NOW(), updated_at = NOW() WHERE user_id = $1 AND integration_type = $2',
        [DEFAULT_USER_ID, integrationType]
      );
    }
  },

  deleteIntegrationConfig: {
    run: async (integrationType: string) => {
      await query('DELETE FROM integration_configs WHERE user_id = $1 AND integration_type = $2', [DEFAULT_USER_ID, integrationType]);
    }
  },

  // Token Usage operations
  createTokenUsage: {
    run: async (taskId: number, phase: string, provider: string, model: string,
                inputTokens: number, outputTokens: number, totalTokens: number, costUsd: number,
                numTurns: number, executionTimeMs: number, refinementRound: number) => {
      await query(
        `INSERT INTO token_usage (user_id, task_id, phase, provider, model, input_tokens, output_tokens, total_tokens, cost_usd, num_turns, execution_time_ms, refinement_round)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [DEFAULT_USER_ID, taskId, phase, provider, model, inputTokens, outputTokens, totalTokens, costUsd, numTurns, executionTimeMs, refinementRound]
      );
    }
  },

  getTokenUsageByTask: {
    all: async (taskId: number) => {
      const result = await query(
        'SELECT * FROM token_usage WHERE user_id = $1 AND task_id = $2 ORDER BY created_at ASC',
        [DEFAULT_USER_ID, taskId]
      );
      return result.rows;
    }
  },

  getTokenUsageSummaryByTask: {
    all: async (taskId: number) => {
      const result = await query(
        `SELECT
          phase,
          provider,
          SUM(input_tokens) as total_input_tokens,
          SUM(output_tokens) as total_output_tokens,
          SUM(total_tokens) as total_tokens,
          SUM(cost_usd) as total_cost,
          SUM(num_turns) as total_turns,
          COUNT(*) as call_count
        FROM token_usage
        WHERE user_id = $1 AND task_id = $2
        GROUP BY phase, provider
        ORDER BY phase, provider`,
        [DEFAULT_USER_ID, taskId]
      );
      return result.rows;
    }
  },

  getAllTokenUsageSummary: {
    all: async () => {
      const result = await query(
        `SELECT
          t.id as task_id,
          t.title as task_title,
          t.status as task_status,
          tu.phase,
          tu.provider,
          SUM(tu.input_tokens) as total_input_tokens,
          SUM(tu.output_tokens) as total_output_tokens,
          SUM(tu.total_tokens) as total_tokens,
          SUM(tu.cost_usd) as total_cost,
          SUM(tu.num_turns) as total_turns,
          COUNT(*) as call_count
        FROM tasks t
        LEFT JOIN token_usage tu ON t.id = tu.task_id AND t.user_id = tu.user_id
        WHERE t.user_id = $1 AND tu.id IS NOT NULL
        GROUP BY t.id, t.title, t.status, tu.phase, tu.provider
        ORDER BY t.id DESC, tu.phase, tu.provider`,
        [DEFAULT_USER_ID]
      );
      return result.rows;
    }
  },

  getTotalTokenUsage: {
    all: async () => {
      const result = await query(
        `SELECT
          provider,
          SUM(input_tokens) as total_input_tokens,
          SUM(output_tokens) as total_output_tokens,
          SUM(total_tokens) as total_tokens,
          SUM(cost_usd) as total_cost,
          COUNT(DISTINCT task_id) as task_count,
          COUNT(*) as call_count
        FROM token_usage
        WHERE user_id = $1
        GROUP BY provider`,
        [DEFAULT_USER_ID]
      );
      return result.rows;
    }
  },

  getTokenUsageByDateRange: {
    all: async (days: number) => {
      const result = await query(
        `SELECT
          DATE(created_at) as date,
          phase,
          provider,
          SUM(input_tokens) as total_input_tokens,
          SUM(output_tokens) as total_output_tokens,
          SUM(total_tokens) as total_tokens,
          SUM(cost_usd) as total_cost
        FROM token_usage
        WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '1 day' * $2
        GROUP BY DATE(created_at), phase, provider
        ORDER BY date DESC, phase, provider`,
        [DEFAULT_USER_ID, days]
      );
      return result.rows;
    }
  },

  // TDD Tasks operations
  createTddTask: {
    run: async (taskId: number, tddStatus: string, currentPhase: string) => {
      const result = await query(
        'INSERT INTO tdd_tasks (user_id, task_id, tdd_status, current_phase) VALUES ($1, $2, $3, $4) RETURNING id',
        [DEFAULT_USER_ID, taskId, tddStatus, currentPhase]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getTddTask: {
    get: async (id: number) => {
      const result = await query('SELECT * FROM tdd_tasks WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  getTddTaskByTaskId: {
    get: async (taskId: number) => {
      const result = await query('SELECT * FROM tdd_tasks WHERE user_id = $1 AND task_id = $2', [DEFAULT_USER_ID, taskId]);
      return result.rows[0];
    }
  },

  getAllTddTasks: {
    all: async () => {
      const result = await query('SELECT * FROM tdd_tasks WHERE user_id = $1 ORDER BY created_at DESC', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  getTddTasksByStatus: {
    all: async (tddStatus: string) => {
      const result = await query(
        'SELECT * FROM tdd_tasks WHERE user_id = $1 AND tdd_status = $2 ORDER BY created_at ASC',
        [DEFAULT_USER_ID, tddStatus]
      );
      return result.rows;
    }
  },

  updateTddTaskStatus: {
    run: async (tddStatus: string, currentPhase: string, id: number) => {
      await query(
        'UPDATE tdd_tasks SET tdd_status = $1, current_phase = $2, updated_at = NOW() WHERE user_id = $3 AND id = $4',
        [tddStatus, currentPhase, DEFAULT_USER_ID, id]
      );
    }
  },

  updateTddTaskSpecification: {
    run: async (specification: string, acceptanceCriteria: string, id: number) => {
      await query(
        'UPDATE tdd_tasks SET specification = $1, acceptance_criteria = $2, updated_at = NOW() WHERE user_id = $3 AND id = $4',
        [specification, acceptanceCriteria, DEFAULT_USER_ID, id]
      );
    }
  },

  updateTddTaskTestCode: {
    run: async (testCode: string, id: number) => {
      await query('UPDATE tdd_tasks SET test_code = $1, updated_at = NOW() WHERE user_id = $2 AND id = $3', [testCode, DEFAULT_USER_ID, id]);
    }
  },

  updateTddTaskImplementation: {
    run: async (implementationCode: string, id: number) => {
      await query('UPDATE tdd_tasks SET implementation_code = $1, updated_at = NOW() WHERE user_id = $2 AND id = $3', [implementationCode, DEFAULT_USER_ID, id]);
    }
  },

  updateTddTaskTestResults: {
    run: async (testResults: string, id: number) => {
      await query('UPDATE tdd_tasks SET test_results = $1, updated_at = NOW() WHERE user_id = $2 AND id = $3', [testResults, DEFAULT_USER_ID, id]);
    }
  },

  incrementTddCycleCount: {
    run: async (id: number) => {
      await query('UPDATE tdd_tasks SET tdd_cycle_count = tdd_cycle_count + 1, updated_at = NOW() WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  deleteTddTask: {
    run: async (id: number) => {
      await query('DELETE FROM tdd_tasks WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  getTddTasksAwaitingClarification: {
    all: async () => {
      const result = await query(
        `SELECT t.* FROM tdd_tasks t WHERE t.user_id = $1 AND t.tdd_status = 'awaiting_clarification' ORDER BY t.created_at ASC`,
        [DEFAULT_USER_ID]
      );
      return result.rows;
    }
  },

  getTddTasksWithAnsweredClarifications: {
    all: async () => {
      const result = await query(
        `SELECT DISTINCT t.* FROM tdd_tasks t
         WHERE t.user_id = $1 AND t.tdd_status = 'awaiting_clarification'
         AND NOT EXISTS (
           SELECT 1 FROM tdd_clarifications c
           WHERE c.tdd_task_id = t.id AND c.user_id = t.user_id AND c.answered_at IS NULL
         )
         AND EXISTS (
           SELECT 1 FROM tdd_clarifications c WHERE c.tdd_task_id = t.id AND c.user_id = t.user_id
         )`,
        [DEFAULT_USER_ID]
      );
      return result.rows;
    }
  },

  // TDD Agent State operations
  createTddAgentState: {
    run: async (tddTaskId: number, stateFilePath: string, checkpointName: string, agentContext: string | null) => {
      const result = await query(
        'INSERT INTO tdd_agent_state (user_id, tdd_task_id, state_file_path, checkpoint_name, agent_context) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [DEFAULT_USER_ID, tddTaskId, stateFilePath, checkpointName, agentContext]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getTddAgentState: {
    get: async (id: number) => {
      const result = await query('SELECT * FROM tdd_agent_state WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  getActiveTddAgentState: {
    get: async (tddTaskId: number) => {
      const result = await query(
        'SELECT * FROM tdd_agent_state WHERE user_id = $1 AND tdd_task_id = $2 AND is_active = 1 ORDER BY paused_at DESC LIMIT 1',
        [DEFAULT_USER_ID, tddTaskId]
      );
      return result.rows[0];
    }
  },

  getTddAgentStateHistory: {
    all: async (tddTaskId: number) => {
      const result = await query(
        'SELECT * FROM tdd_agent_state WHERE user_id = $1 AND tdd_task_id = $2 ORDER BY paused_at DESC',
        [DEFAULT_USER_ID, tddTaskId]
      );
      return result.rows;
    }
  },

  updateTddAgentStateResumed: {
    run: async (id: number) => {
      await query('UPDATE tdd_agent_state SET resumed_at = NOW(), is_active = 0 WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  deactivateAllTddAgentStates: {
    run: async (tddTaskId: number) => {
      await query('UPDATE tdd_agent_state SET is_active = 0 WHERE user_id = $1 AND tdd_task_id = $2', [DEFAULT_USER_ID, tddTaskId]);
    }
  },

  // TDD Clarifications operations
  createTddClarification: {
    run: async (tddTaskId: number, questionText: string, questionType: string, suggestedOptions: string | null,
                required: number, orderIndex: number, agentStateId: number | null) => {
      const result = await query(
        'INSERT INTO tdd_clarifications (user_id, tdd_task_id, question_text, question_type, suggested_options, required, order_index, agent_state_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
        [DEFAULT_USER_ID, tddTaskId, questionText, questionType, suggestedOptions, required, orderIndex, agentStateId]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getTddClarifications: {
    all: async (tddTaskId: number) => {
      const result = await query(
        'SELECT * FROM tdd_clarifications WHERE user_id = $1 AND tdd_task_id = $2 ORDER BY order_index ASC',
        [DEFAULT_USER_ID, tddTaskId]
      );
      return result.rows;
    }
  },

  getTddClarification: {
    get: async (id: number) => {
      const result = await query('SELECT * FROM tdd_clarifications WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  getUnansweredTddClarifications: {
    all: async (tddTaskId: number) => {
      const result = await query(
        'SELECT * FROM tdd_clarifications WHERE user_id = $1 AND tdd_task_id = $2 AND answered_at IS NULL ORDER BY order_index ASC',
        [DEFAULT_USER_ID, tddTaskId]
      );
      return result.rows;
    }
  },

  answerTddClarification: {
    run: async (userAnswer: string, answerType: string, id: number) => {
      await query(
        'UPDATE tdd_clarifications SET user_answer = $1, answer_type = $2, answered_at = NOW() WHERE user_id = $3 AND id = $4',
        [userAnswer, answerType, DEFAULT_USER_ID, id]
      );
    }
  },

  deleteTddClarifications: {
    run: async (tddTaskId: number) => {
      await query('DELETE FROM tdd_clarifications WHERE user_id = $1 AND tdd_task_id = $2', [DEFAULT_USER_ID, tddTaskId]);
    }
  },

  // External Skills operations
  createExternalSkill: {
    run: async (skillName: string, skillPath: string, description: string | null, activationTriggers: string | null,
                skillContent: string, version: string | null, isCore: number, hasChecklist: number, hasDiagrams: number, hasExamples: number) => {
      const result = await query(
        `INSERT INTO external_skills (user_id, skill_name, skill_path, description, activation_triggers, skill_content, version, is_core, has_checklist, has_diagrams, has_examples)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [DEFAULT_USER_ID, skillName, skillPath, description, activationTriggers, skillContent, version, isCore, hasChecklist, hasDiagrams, hasExamples]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  upsertExternalSkill: {
    run: async (skillName: string, skillPath: string, description: string | null, activationTriggers: string | null,
                skillContent: string, version: string | null, isCore: number, hasChecklist: number, hasDiagrams: number, hasExamples: number) => {
      await query(
        `INSERT INTO external_skills (user_id, skill_name, skill_path, description, activation_triggers, skill_content, version, is_core, has_checklist, has_diagrams, has_examples, last_synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
         ON CONFLICT (user_id, skill_name) DO UPDATE SET
           skill_path = EXCLUDED.skill_path,
           description = EXCLUDED.description,
           activation_triggers = EXCLUDED.activation_triggers,
           skill_content = EXCLUDED.skill_content,
           version = EXCLUDED.version,
           is_core = EXCLUDED.is_core,
           has_checklist = EXCLUDED.has_checklist,
           has_diagrams = EXCLUDED.has_diagrams,
           has_examples = EXCLUDED.has_examples,
           last_synced_at = NOW()`,
        [DEFAULT_USER_ID, skillName, skillPath, description, activationTriggers, skillContent, version, isCore, hasChecklist, hasDiagrams, hasExamples]
      );
    }
  },

  getExternalSkill: {
    get: async (id: number) => {
      const result = await query('SELECT * FROM external_skills WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  getExternalSkillByName: {
    get: async (skillName: string) => {
      const result = await query('SELECT * FROM external_skills WHERE user_id = $1 AND skill_name = $2', [DEFAULT_USER_ID, skillName]);
      return result.rows[0];
    }
  },

  getAllExternalSkills: {
    all: async () => {
      const result = await query('SELECT * FROM external_skills WHERE user_id = $1 ORDER BY skill_name', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  getActiveExternalSkills: {
    all: async () => {
      const result = await query('SELECT * FROM external_skills WHERE user_id = $1 AND is_active = 1 ORDER BY skill_name', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  getCoreExternalSkills: {
    all: async () => {
      const result = await query('SELECT * FROM external_skills WHERE user_id = $1 AND is_core = 1 AND is_active = 1 ORDER BY skill_name', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  toggleExternalSkillActive: {
    run: async (id: number) => {
      await query(
        'UPDATE external_skills SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE user_id = $1 AND id = $2',
        [DEFAULT_USER_ID, id]
      );
    }
  },

  deleteAllExternalSkills: {
    run: async () => {
      await query('DELETE FROM external_skills WHERE user_id = $1', [DEFAULT_USER_ID]);
    }
  },

  // TDD Execution Logs operations
  createTddExecutionLog: {
    run: async (tddTaskId: number, phase: string, skillUsed: string | null, inputContext: string | null) => {
      const result = await query(
        'INSERT INTO tdd_execution_logs (user_id, tdd_task_id, phase, skill_used, input_context, started_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id',
        [DEFAULT_USER_ID, tddTaskId, phase, skillUsed, inputContext]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  completeTddExecutionLog: {
    run: async (outputResult: string | null, testOutput: string | null, elapsedSeconds: number, success: number, error: string | null, id: number) => {
      await query(
        'UPDATE tdd_execution_logs SET output_result = $1, test_output = $2, completed_at = NOW(), elapsed_seconds = $3, success = $4, error = $5 WHERE user_id = $6 AND id = $7',
        [outputResult, testOutput, elapsedSeconds, success, error, DEFAULT_USER_ID, id]
      );
    }
  },

  getTddExecutionLogs: {
    all: async (tddTaskId: number) => {
      const result = await query(
        'SELECT * FROM tdd_execution_logs WHERE user_id = $1 AND tdd_task_id = $2 ORDER BY started_at ASC',
        [DEFAULT_USER_ID, tddTaskId]
      );
      return result.rows;
    }
  },

  getTddExecutionLogsByPhase: {
    all: async (tddTaskId: number, phase: string) => {
      const result = await query(
        'SELECT * FROM tdd_execution_logs WHERE user_id = $1 AND tdd_task_id = $2 AND phase = $3 ORDER BY started_at ASC',
        [DEFAULT_USER_ID, tddTaskId, phase]
      );
      return result.rows;
    }
  },

  // TDD Test Results operations
  createTddTestResult: {
    run: async (tddTaskId: number, cycleNumber: number, phase: string, testCommand: string | null,
                exitCode: number | null, stdout: string | null, stderr: string | null,
                passed: number, failed: number, skipped: number, durationMs: number) => {
      const result = await query(
        `INSERT INTO tdd_test_results (user_id, tdd_task_id, cycle_number, phase, test_command, exit_code, stdout, stderr, passed, failed, skipped, duration_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [DEFAULT_USER_ID, tddTaskId, cycleNumber, phase, testCommand, exitCode, stdout, stderr, passed, failed, skipped, durationMs]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getTddTestResults: {
    all: async (tddTaskId: number) => {
      const result = await query(
        'SELECT * FROM tdd_test_results WHERE user_id = $1 AND tdd_task_id = $2 ORDER BY created_at ASC',
        [DEFAULT_USER_ID, tddTaskId]
      );
      return result.rows;
    }
  },

  getTddTestResultsByCycle: {
    all: async (tddTaskId: number, cycleNumber: number) => {
      const result = await query(
        'SELECT * FROM tdd_test_results WHERE user_id = $1 AND tdd_task_id = $2 AND cycle_number = $3 ORDER BY created_at ASC',
        [DEFAULT_USER_ID, tddTaskId, cycleNumber]
      );
      return result.rows;
    }
  },

  getLatestTddTestResult: {
    get: async (tddTaskId: number) => {
      const result = await query(
        'SELECT * FROM tdd_test_results WHERE user_id = $1 AND tdd_task_id = $2 ORDER BY created_at DESC LIMIT 1',
        [DEFAULT_USER_ID, tddTaskId]
      );
      return result.rows[0];
    }
  },

  // Agentic Workflow - Project Groups
  createProjectGroup: {
    run: async (name: string, description: string | null, isDefault: number) => {
      const result = await query(
        'INSERT INTO project_groups (user_id, name, description, is_default) VALUES ($1, $2, $3, $4) RETURNING id',
        [DEFAULT_USER_ID, name, description, isDefault]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getProjectGroup: {
    get: async (id: number) => {
      const result = await query('SELECT * FROM project_groups WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  getProjectGroupByName: {
    get: async (name: string) => {
      const result = await query('SELECT * FROM project_groups WHERE user_id = $1 AND name = $2', [DEFAULT_USER_ID, name]);
      return result.rows[0];
    }
  },

  getAllProjectGroups: {
    all: async () => {
      const result = await query('SELECT * FROM project_groups WHERE user_id = $1 ORDER BY name', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  getDefaultProjectGroup: {
    get: async () => {
      const result = await query('SELECT * FROM project_groups WHERE user_id = $1 AND is_default = 1 LIMIT 1', [DEFAULT_USER_ID]);
      return result.rows[0];
    }
  },

  updateProjectGroup: {
    run: async (name: string, description: string | null, id: number) => {
      await query(
        'UPDATE project_groups SET name = $1, description = $2, updated_at = NOW() WHERE user_id = $3 AND id = $4',
        [name, description, DEFAULT_USER_ID, id]
      );
    }
  },

  clearDefaultProjectGroup: {
    run: async () => {
      await query('UPDATE project_groups SET is_default = 0 WHERE user_id = $1', [DEFAULT_USER_ID]);
    }
  },

  setDefaultProjectGroup: {
    run: async (id: number) => {
      await query('UPDATE project_groups SET is_default = 1 WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  deleteProjectGroup: {
    run: async (id: number) => {
      await query('DELETE FROM project_groups WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  // Project Group Members
  addProjectToGroup: {
    run: async (groupId: number, projectId: number, isPrimary: number) => {
      await query(
        'INSERT INTO project_group_members (user_id, group_id, project_id, is_primary) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        [DEFAULT_USER_ID, groupId, projectId, isPrimary]
      );
    }
  },

  removeProjectFromGroup: {
    run: async (groupId: number, projectId: number) => {
      await query('DELETE FROM project_group_members WHERE user_id = $1 AND group_id = $2 AND project_id = $3', [DEFAULT_USER_ID, groupId, projectId]);
    }
  },

  getProjectGroupMembers: {
    all: async (groupId: number) => {
      const result = await query(
        `SELECT pgm.*, p.name as project_name, p.local_path, p.git_remote_url, p.git_branch
         FROM project_group_members pgm
         JOIN projects p ON pgm.project_id = p.id AND pgm.user_id = p.user_id
         WHERE pgm.user_id = $1 AND pgm.group_id = $2
         ORDER BY pgm.is_primary DESC, p.name`,
        [DEFAULT_USER_ID, groupId]
      );
      return result.rows;
    }
  },

  clearPrimaryProject: {
    run: async (groupId: number) => {
      await query('UPDATE project_group_members SET is_primary = 0 WHERE user_id = $1 AND group_id = $2', [DEFAULT_USER_ID, groupId]);
    }
  },

  setPrimaryProject: {
    run: async (groupId: number, projectId: number) => {
      await query('UPDATE project_group_members SET is_primary = 1 WHERE user_id = $1 AND group_id = $2 AND project_id = $3', [DEFAULT_USER_ID, groupId, projectId]);
    }
  },

  // Agentic Workflow - Global Documents
  createGlobalDocument: {
    run: async (filename: string, originalFilename: string, filePath: string, fileSize: number,
                mimeType: string, description: string | null, category: string | null, tags: string | null, uploadedBy: string | null) => {
      const result = await query(
        `INSERT INTO global_documents (user_id, filename, original_filename, file_path, file_size, mime_type, description, category, tags, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [DEFAULT_USER_ID, filename, originalFilename, filePath, fileSize, mimeType, description, category, tags, uploadedBy]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getGlobalDocument: {
    get: async (id: number) => {
      const result = await query('SELECT * FROM global_documents WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  getAllGlobalDocuments: {
    all: async () => {
      const result = await query('SELECT * FROM global_documents WHERE user_id = $1 ORDER BY created_at DESC', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  getGlobalDocumentsByCategory: {
    all: async (category: string) => {
      const result = await query(
        'SELECT * FROM global_documents WHERE user_id = $1 AND category = $2 ORDER BY created_at DESC',
        [DEFAULT_USER_ID, category]
      );
      return result.rows;
    }
  },

  updateGlobalDocument: {
    run: async (description: string | null, category: string | null, tags: string | null, id: number) => {
      await query(
        'UPDATE global_documents SET description = $1, category = $2, tags = $3, updated_at = NOW() WHERE user_id = $4 AND id = $5',
        [description, category, tags, DEFAULT_USER_ID, id]
      );
    }
  },

  deleteGlobalDocument: {
    run: async (id: number) => {
      await query('DELETE FROM global_documents WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  // Agentic Workflow - Tasks
  createAgenticTask: {
    run: async (title: string, description: string | null, status: string, phase: string, priority: string,
                projectGroupId: number | null, autoAdvance: number, errorHandling: string, executionStrategy: string,
                codeReviewPoint: string, mcpServersConfig: string | null, verificationCommands: string | null, referenceTaskIds: string | null) => {
      const result = await query(
        `INSERT INTO agentic_tasks (user_id, title, description, status, phase, priority, project_group_id,
                                    auto_advance, error_handling, execution_strategy, code_review_point,
                                    mcp_servers_config, verification_commands, reference_task_ids)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING id`,
        [DEFAULT_USER_ID, title, description, status, phase, priority, projectGroupId, autoAdvance, errorHandling,
         executionStrategy, codeReviewPoint, mcpServersConfig, verificationCommands, referenceTaskIds]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getAgenticTask: {
    get: async (id: number) => {
      const result = await query('SELECT * FROM agentic_tasks WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  getAllAgenticTasks: {
    all: async () => {
      const result = await query('SELECT * FROM agentic_tasks WHERE user_id = $1 ORDER BY created_at DESC', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  getAgenticTasksByStatus: {
    all: async (status: string) => {
      const result = await query(
        'SELECT * FROM agentic_tasks WHERE user_id = $1 AND status = $2 ORDER BY created_at ASC',
        [DEFAULT_USER_ID, status]
      );
      return result.rows;
    }
  },

  getAgenticTasksByPhase: {
    all: async (phase: string) => {
      const result = await query(
        'SELECT * FROM agentic_tasks WHERE user_id = $1 AND phase = $2 ORDER BY created_at ASC',
        [DEFAULT_USER_ID, phase]
      );
      return result.rows;
    }
  },

  getAgenticTasksByProjectGroup: {
    all: async (projectGroupId: number) => {
      const result = await query(
        'SELECT * FROM agentic_tasks WHERE user_id = $1 AND project_group_id = $2 ORDER BY created_at DESC',
        [DEFAULT_USER_ID, projectGroupId]
      );
      return result.rows;
    }
  },

  updateAgenticTaskStatus: {
    run: async (status: string, phase: string, id: number) => {
      await query(
        'UPDATE agentic_tasks SET status = $1, phase = $2, updated_at = NOW() WHERE user_id = $3 AND id = $4',
        [status, phase, DEFAULT_USER_ID, id]
      );
    }
  },

  updateAgenticTaskPhase: {
    run: async (phase: string, id: number) => {
      await query('UPDATE agentic_tasks SET phase = $1, updated_at = NOW() WHERE user_id = $2 AND id = $3', [phase, DEFAULT_USER_ID, id]);
    }
  },

  updateAgenticTaskTokens: {
    run: async (inputTokens: number, outputTokens: number, costUsd: number, id: number) => {
      await query(
        `UPDATE agentic_tasks
         SET total_input_tokens = total_input_tokens + $1,
             total_output_tokens = total_output_tokens + $2,
             total_cost_usd = total_cost_usd + $3,
             updated_at = NOW()
         WHERE user_id = $4 AND id = $5`,
        [inputTokens, outputTokens, costUsd, DEFAULT_USER_ID, id]
      );
    }
  },

  updateAgenticTaskBrainstormingContext: {
    run: async (brainstormingContext: string, id: number) => {
      await query(
        `UPDATE agentic_tasks
         SET brainstorming_context = $1,
             updated_at = NOW()
         WHERE user_id = $2 AND id = $3`,
        [brainstormingContext, DEFAULT_USER_ID, id]
      );
    }
  },

  deleteAgenticTask: {
    run: async (id: number) => {
      await query('DELETE FROM agentic_tasks WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  // Task Documents
  addAgenticTaskDocument: {
    run: async (taskId: number, documentType: string, documentId: number) => {
      await query(
        'INSERT INTO agentic_task_documents (user_id, task_id, document_type, document_id) VALUES ($1, $2, $3, $4)',
        [DEFAULT_USER_ID, taskId, documentType, documentId]
      );
    }
  },

  getAgenticTaskDocuments: {
    all: async (taskId: number) => {
      const result = await query('SELECT * FROM agentic_task_documents WHERE user_id = $1 AND task_id = $2', [DEFAULT_USER_ID, taskId]);
      return result.rows;
    }
  },

  removeAgenticTaskDocument: {
    run: async (id: number) => {
      await query('DELETE FROM agentic_task_documents WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  // Task Uploads
  createAgenticTaskUpload: {
    run: async (taskId: number, filename: string, originalFilename: string, filePath: string,
                fileSize: number, mimeType: string, description: string | null) => {
      const result = await query(
        `INSERT INTO agentic_task_uploads (user_id, task_id, filename, original_filename, file_path, file_size, mime_type, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [DEFAULT_USER_ID, taskId, filename, originalFilename, filePath, fileSize, mimeType, description]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getAgenticTaskUploads: {
    all: async (taskId: number) => {
      const result = await query('SELECT * FROM agentic_task_uploads WHERE user_id = $1 AND task_id = $2', [DEFAULT_USER_ID, taskId]);
      return result.rows;
    }
  },

  deleteAgenticTaskUpload: {
    run: async (id: number) => {
      await query('DELETE FROM agentic_task_uploads WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  // Agentic Workflow - Clarifications
  createAgenticClarification: {
    run: async (taskId: number, questionText: string, questionType: string, suggestedOptions: string | null, required: number, orderIndex: number) => {
      const result = await query(
        'INSERT INTO agentic_clarifications (user_id, task_id, question_text, question_type, suggested_options, required, order_index) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [DEFAULT_USER_ID, taskId, questionText, questionType, suggestedOptions, required, orderIndex]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getAgenticClarifications: {
    all: async (taskId: number) => {
      const result = await query(
        'SELECT * FROM agentic_clarifications WHERE user_id = $1 AND task_id = $2 ORDER BY order_index ASC',
        [DEFAULT_USER_ID, taskId]
      );
      return result.rows;
    }
  },

  getAgenticClarification: {
    get: async (id: number) => {
      const result = await query('SELECT * FROM agentic_clarifications WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  getUnansweredAgenticClarifications: {
    all: async (taskId: number) => {
      const result = await query(
        'SELECT * FROM agentic_clarifications WHERE user_id = $1 AND task_id = $2 AND answered_at IS NULL ORDER BY order_index ASC',
        [DEFAULT_USER_ID, taskId]
      );
      return result.rows;
    }
  },

  answerAgenticClarification: {
    run: async (userAnswer: string, answerType: string, id: number) => {
      await query(
        'UPDATE agentic_clarifications SET user_answer = $1, answer_type = $2, answered_at = NOW() WHERE user_id = $3 AND id = $4',
        [userAnswer, answerType, DEFAULT_USER_ID, id]
      );
    }
  },

  deleteAgenticClarifications: {
    run: async (taskId: number) => {
      await query('DELETE FROM agentic_clarifications WHERE user_id = $1 AND task_id = $2', [DEFAULT_USER_ID, taskId]);
    }
  },

  // Agentic Workflow - Plans
  createAgenticPlan: {
    run: async (taskId: number, goal: string | null, architecture: string | null, techStack: string | null, planContent: string, planSteps: string) => {
      const result = await query(
        'INSERT INTO agentic_plans (user_id, task_id, goal, architecture, tech_stack, plan_content, plan_steps) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [DEFAULT_USER_ID, taskId, goal, architecture, techStack, planContent, planSteps]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getAgenticPlan: {
    get: async (taskId: number) => {
      const result = await query('SELECT * FROM agentic_plans WHERE user_id = $1 AND task_id = $2', [DEFAULT_USER_ID, taskId]);
      return result.rows[0];
    }
  },

  getAgenticPlanById: {
    get: async (planId: number) => {
      const result = await query('SELECT * FROM agentic_plans WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, planId]);
      return result.rows[0];
    }
  },

  updateAgenticPlan: {
    run: async (goal: string | null, architecture: string | null, techStack: string | null, planContent: string, planSteps: string, taskId: number) => {
      await query(
        `UPDATE agentic_plans
         SET goal = $1, architecture = $2, tech_stack = $3, plan_content = $4, plan_steps = $5,
             user_modified = 1, version = version + 1, updated_at = NOW()
         WHERE user_id = $6 AND task_id = $7`,
        [goal, architecture, techStack, planContent, planSteps, DEFAULT_USER_ID, taskId]
      );
    }
  },

  approveAgenticPlan: {
    run: async (taskId: number) => {
      await query(
        'UPDATE agentic_plans SET approved = 1, approved_at = NOW(), updated_at = NOW() WHERE user_id = $1 AND task_id = $2',
        [DEFAULT_USER_ID, taskId]
      );
    }
  },

  deleteAgenticPlan: {
    run: async (taskId: number) => {
      await query('DELETE FROM agentic_plans WHERE user_id = $1 AND task_id = $2', [DEFAULT_USER_ID, taskId]);
    }
  },

  // Plan Steps
  createAgenticPlanStep: {
    run: async (planId: number, stepIndex: number, stepTitle: string, stepDescription: string, complexity: string, filePaths: string) => {
      const result = await query(
        'INSERT INTO agentic_plan_steps (user_id, plan_id, step_index, step_title, step_description, estimated_complexity, file_paths, step_content) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
        [DEFAULT_USER_ID, planId, stepIndex, stepTitle, stepDescription, complexity, filePaths, stepTitle]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getAgenticPlanSteps: {
    all: async (planId: number) => {
      const result = await query('SELECT * FROM agentic_plan_steps WHERE user_id = $1 AND plan_id = $2 ORDER BY step_index', [DEFAULT_USER_ID, planId]);
      return result.rows;
    }
  },

  updateAgenticPlanStepStatus: {
    run: async (status: string, id: number) => {
      await query(
        `UPDATE agentic_plan_steps
         SET status = $1,
             started_at = CASE WHEN $1 = 'in_progress' THEN NOW() ELSE started_at END,
             completed_at = CASE WHEN $1 IN ('completed', 'failed', 'skipped') THEN NOW() ELSE completed_at END
         WHERE user_id = $2 AND id = $3`,
        [status, DEFAULT_USER_ID, id]
      );
    }
  },

  updateAgenticPlanStepOutput: {
    run: async (output: string | null, error: string | null, id: number) => {
      await query('UPDATE agentic_plan_steps SET output = $1, error = $2 WHERE user_id = $3 AND id = $4', [output, error, DEFAULT_USER_ID, id]);
    }
  },

  updateAgenticPlanStepReview: {
    run: async (reviewStatus: string | null, reviewNotes: string | null, id: number) => {
      await query('UPDATE agentic_plan_steps SET review_status = $1, review_notes = $2 WHERE user_id = $3 AND id = $4', [reviewStatus, reviewNotes, DEFAULT_USER_ID, id]);
    }
  },

  deleteAgenticPlanSteps: {
    run: async (planId: number) => {
      await query('DELETE FROM agentic_plan_steps WHERE user_id = $1 AND plan_id = $2', [DEFAULT_USER_ID, planId]);
    }
  },

  // Agentic Workflow - Git Worktrees
  createAgenticWorktree: {
    run: async (taskId: number, projectId: number, worktreePath: string, branchName: string, baseBranch: string) => {
      const result = await query(
        'INSERT INTO agentic_worktrees (user_id, task_id, project_id, worktree_path, branch_name, base_branch) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [DEFAULT_USER_ID, taskId, projectId, worktreePath, branchName, baseBranch]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getAgenticWorktree: {
    get: async (id: number) => {
      const result = await query('SELECT * FROM agentic_worktrees WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  getAgenticWorktreesByTask: {
    all: async (taskId: number) => {
      const result = await query('SELECT * FROM agentic_worktrees WHERE user_id = $1 AND task_id = $2', [DEFAULT_USER_ID, taskId]);
      return result.rows;
    }
  },

  getAgenticWorktreeByTaskAndProject: {
    get: async (taskId: number, projectId: number) => {
      const result = await query('SELECT * FROM agentic_worktrees WHERE user_id = $1 AND task_id = $2 AND project_id = $3', [DEFAULT_USER_ID, taskId, projectId]);
      return result.rows[0];
    }
  },

  updateAgenticWorktreeStatus: {
    run: async (status: string, id: number) => {
      await query(
        `UPDATE agentic_worktrees
         SET status = $1, merged_at = CASE WHEN $1 = 'merged' THEN NOW() ELSE merged_at END,
             deleted_at = CASE WHEN $1 = 'deleted' THEN NOW() ELSE deleted_at END
         WHERE user_id = $2 AND id = $3`,
        [status, DEFAULT_USER_ID, id]
      );
    }
  },

  deleteAgenticWorktree: {
    run: async (id: number) => {
      await query('DELETE FROM agentic_worktrees WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  // Agentic Workflow - Pull Requests
  createAgenticPR: {
    run: async (taskId: number, prGroupId: string, projectId: number, worktreeId: number, prTitle: string | null, prBody: string | null) => {
      const result = await query(
        'INSERT INTO agentic_pull_requests (user_id, task_id, pr_group_id, project_id, worktree_id, pr_title, pr_body) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [DEFAULT_USER_ID, taskId, prGroupId, projectId, worktreeId, prTitle, prBody]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getAgenticPR: {
    get: async (id: number) => {
      const result = await query('SELECT * FROM agentic_pull_requests WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  getAgenticPRsByTask: {
    all: async (taskId: number) => {
      const result = await query('SELECT * FROM agentic_pull_requests WHERE user_id = $1 AND task_id = $2', [DEFAULT_USER_ID, taskId]);
      return result.rows;
    }
  },

  getAgenticPRsByGroup: {
    all: async (prGroupId: string) => {
      const result = await query('SELECT * FROM agentic_pull_requests WHERE user_id = $1 AND pr_group_id = $2', [DEFAULT_USER_ID, prGroupId]);
      return result.rows;
    }
  },

  updateAgenticPRStatus: {
    run: async (prStatus: string, prNumber: number | null, prUrl: string | null, id: number) => {
      await query(
        `UPDATE agentic_pull_requests
         SET pr_status = $1, pr_number = $2, pr_url = $3,
             merged_at = CASE WHEN $1 = 'merged' THEN NOW() ELSE merged_at END,
             updated_at = NOW()
         WHERE user_id = $4 AND id = $5`,
        [prStatus, prNumber, prUrl, DEFAULT_USER_ID, id]
      );
    }
  },

  updateAgenticPRRollback: {
    run: async (rollbackBranch: string, id: number) => {
      await query(
        `UPDATE agentic_pull_requests SET pr_status = 'rolled_back', rollback_branch = $1, updated_at = NOW() WHERE user_id = $2 AND id = $3`,
        [rollbackBranch, DEFAULT_USER_ID, id]
      );
    }
  },

  // Agentic Workflow - Verifications
  createAgenticVerification: {
    run: async (taskId: number, checkName: string, checkCommand: string, projectId: number | null) => {
      const result = await query(
        'INSERT INTO agentic_verifications (user_id, task_id, check_name, check_command, project_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [DEFAULT_USER_ID, taskId, checkName, checkCommand, projectId]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getAgenticVerifications: {
    all: async (taskId: number) => {
      const result = await query('SELECT * FROM agentic_verifications WHERE user_id = $1 AND task_id = $2', [DEFAULT_USER_ID, taskId]);
      return result.rows;
    }
  },

  updateAgenticVerificationStatus: {
    run: async (status: string, exitCode: number | null, stdout: string | null, stderr: string | null, durationMs: number | null, id: number) => {
      await query(
        `UPDATE agentic_verifications
         SET status = $1, exit_code = $2, stdout = $3, stderr = $4, duration_ms = $5, executed_at = NOW()
         WHERE user_id = $6 AND id = $7`,
        [status, exitCode, stdout, stderr, durationMs, DEFAULT_USER_ID, id]
      );
    }
  },

  deleteAgenticVerifications: {
    run: async (taskId: number) => {
      await query('DELETE FROM agentic_verifications WHERE user_id = $1 AND task_id = $2', [DEFAULT_USER_ID, taskId]);
    }
  },

  // Agentic Workflow - Execution Logs
  createAgenticLog: {
    run: async (taskId: number, phase: string, stepId: number | null, logType: string, message: string, metadata: string | null) => {
      const result = await query(
        'INSERT INTO agentic_execution_logs (user_id, task_id, phase, step_id, log_type, message, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [DEFAULT_USER_ID, taskId, phase, stepId, logType, message, metadata]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getAgenticLogs: {
    all: async (taskId: number) => {
      const result = await query(
        'SELECT * FROM agentic_execution_logs WHERE user_id = $1 AND task_id = $2 ORDER BY created_at ASC',
        [DEFAULT_USER_ID, taskId]
      );
      return result.rows;
    }
  },

  getAgenticLogsByPhase: {
    all: async (taskId: number, phase: string) => {
      const result = await query(
        'SELECT * FROM agentic_execution_logs WHERE user_id = $1 AND task_id = $2 AND phase = $3 ORDER BY created_at ASC',
        [DEFAULT_USER_ID, taskId, phase]
      );
      return result.rows;
    }
  },

  getRecentAgenticLogs: {
    all: async (taskId: number, limit: number) => {
      const result = await query(
        'SELECT * FROM agentic_execution_logs WHERE user_id = $1 AND task_id = $2 ORDER BY created_at DESC LIMIT $3',
        [DEFAULT_USER_ID, taskId, limit]
      );
      return result.rows;
    }
  },

  deleteAgenticLogs: {
    run: async (taskId: number) => {
      await query('DELETE FROM agentic_execution_logs WHERE user_id = $1 AND task_id = $2', [DEFAULT_USER_ID, taskId]);
    }
  },

  // Agentic Workflow - Task History
  createAgenticTaskHistory: {
    run: async (taskId: number, archivedData: string, contextSummary: string | null, finalStatus: string, prGroupInfo: string | null, rollbackInfo: string | null) => {
      const result = await query(
        'INSERT INTO agentic_task_history (user_id, task_id, archived_data, context_summary, final_status, pr_group_info, rollback_info) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [DEFAULT_USER_ID, taskId, archivedData, contextSummary, finalStatus, prGroupInfo, rollbackInfo]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getAgenticTaskHistory: {
    all: async (taskId: number) => {
      const result = await query('SELECT * FROM agentic_task_history WHERE user_id = $1 AND task_id = $2', [DEFAULT_USER_ID, taskId]);
      return result.rows;
    }
  },

  getAllAgenticTaskHistory: {
    all: async () => {
      const result = await query('SELECT * FROM agentic_task_history WHERE user_id = $1 ORDER BY archived_at DESC', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  // Agentic Workflow - Slack Notifications
  createSlackConfig: {
    run: async (projectGroupId: number | null, webhookUrl: string, notifyPhaseChanges: number,
                notifyUserAction: number, notifyCompletion: number, notifyErrors: number, includeTokenUsage: number) => {
      const result = await query(
        `INSERT INTO slack_notification_config (user_id, project_group_id, webhook_url, notify_phase_changes, notify_user_action, notify_completion, notify_errors, include_token_usage)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [DEFAULT_USER_ID, projectGroupId, webhookUrl, notifyPhaseChanges, notifyUserAction, notifyCompletion, notifyErrors, includeTokenUsage]
      );
      return { lastInsertRowid: result.rows[0].id };
    }
  },

  getSlackConfig: {
    get: async (id: number) => {
      const result = await query('SELECT * FROM slack_notification_config WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
      return result.rows[0];
    }
  },

  getSlackConfigByGroup: {
    get: async (projectGroupId: number) => {
      const result = await query('SELECT * FROM slack_notification_config WHERE user_id = $1 AND project_group_id = $2', [DEFAULT_USER_ID, projectGroupId]);
      return result.rows[0];
    }
  },

  getAllSlackConfigs: {
    all: async () => {
      const result = await query('SELECT * FROM slack_notification_config WHERE user_id = $1 ORDER BY created_at DESC', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  getActiveSlackConfigs: {
    all: async () => {
      const result = await query('SELECT * FROM slack_notification_config WHERE user_id = $1 AND is_active = 1', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  updateSlackConfig: {
    run: async (webhookUrl: string, notifyPhaseChanges: number, notifyUserAction: number,
                notifyCompletion: number, notifyErrors: number, includeTokenUsage: number, isActive: number, id: number) => {
      await query(
        `UPDATE slack_notification_config
         SET webhook_url = $1, notify_phase_changes = $2, notify_user_action = $3, notify_completion = $4,
             notify_errors = $5, include_token_usage = $6, is_active = $7, updated_at = NOW()
         WHERE user_id = $8 AND id = $9`,
        [webhookUrl, notifyPhaseChanges, notifyUserAction, notifyCompletion, notifyErrors, includeTokenUsage, isActive, DEFAULT_USER_ID, id]
      );
    }
  },

  deleteSlackConfig: {
    run: async (id: number) => {
      await query('DELETE FROM slack_notification_config WHERE user_id = $1 AND id = $2', [DEFAULT_USER_ID, id]);
    }
  },

  // Agentic Workflow - Board Visibility
  upsertBoardVisibility: {
    run: async (boardName: string, isVisible: number, displayOrder: number) => {
      await query(
        `INSERT INTO board_visibility (user_id, board_name, is_visible, display_order)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, board_name) DO UPDATE SET
           is_visible = EXCLUDED.is_visible,
           display_order = EXCLUDED.display_order,
           updated_at = NOW()`,
        [DEFAULT_USER_ID, boardName, isVisible, displayOrder]
      );
    }
  },

  getBoardVisibility: {
    get: async (boardName: string) => {
      const result = await query('SELECT * FROM board_visibility WHERE user_id = $1 AND board_name = $2', [DEFAULT_USER_ID, boardName]);
      return result.rows[0];
    }
  },

  getAllBoardVisibility: {
    all: async () => {
      const result = await query('SELECT * FROM board_visibility WHERE user_id = $1 ORDER BY display_order', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  getVisibleBoards: {
    all: async () => {
      const result = await query('SELECT * FROM board_visibility WHERE user_id = $1 AND is_visible = 1 ORDER BY display_order', [DEFAULT_USER_ID]);
      return result.rows;
    }
  },

  updateBoardVisibility: {
    run: async (isVisible: number, boardName: string) => {
      await query('UPDATE board_visibility SET is_visible = $1, updated_at = NOW() WHERE user_id = $2 AND board_name = $3', [isVisible, DEFAULT_USER_ID, boardName]);
    }
  },
};

// Initialize database on module load
if (!isInBuildPhase()) {
  initializeDatabase().catch(console.error);
}

// Export pool and DEFAULT_USER_ID for analytics routes that use direct queries
export { pool, DEFAULT_USER_ID };

export default db;
