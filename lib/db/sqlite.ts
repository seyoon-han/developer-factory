import Database from 'better-sqlite3';
import path from 'path';
import { TaskStatus, TaskPriority } from '@/types/task';

const dbPath = path.join(process.cwd(), 'data', 'tasks.db');

// Function to check build phase at runtime (not build time constant)
function isInBuildPhase() {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

// Ensure data directory exists (skip during build)
import fs from 'fs';
if (!isInBuildPhase()) {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Create database connection (stub during build)
export const db = isInBuildPhase() ? null as any : new Database(dbPath);

// Enable WAL mode for better concurrency (skip during build)
if (!isInBuildPhase() && db) {
  db.pragma('journal_mode = WAL');
}

// Create tables (skip during build)
if (!isInBuildPhase() && db) {
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    priority TEXT NOT NULL DEFAULT 'medium',
    board_id TEXT NOT NULL,
    assignee TEXT,
    reference_task_ids TEXT,
    use_context7 INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS task_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    question TEXT NOT NULL,
    answer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS task_prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    original_description TEXT NOT NULL,
    enhanced_prompt TEXT,
    status TEXT DEFAULT 'pending',
    approved INTEGER DEFAULT 0,
    approved_at DATETIME,
    refinement_status TEXT DEFAULT 'idle',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS task_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS task_implementation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL UNIQUE,
    status TEXT DEFAULT 'waiting',
    started_at DATETIME,
    completed_at DATETIME,
    elapsed_seconds INTEGER DEFAULT 0,
    git_commit_hash TEXT,
    git_restore_point TEXT,
    implementation_report TEXT,
    report_status TEXT DEFAULT 'pending',
    report_generated_at DATETIME,
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS task_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    url TEXT,
    uploaded_by TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS project_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    url TEXT,
    uploaded_by TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    category TEXT DEFAULT 'other',
    tags TEXT,
    is_public BOOLEAN DEFAULT 0,
    version INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS presubmit_evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    expert_role TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    started_at DATETIME,
    completed_at DATETIME,
    elapsed_seconds INTEGER DEFAULT 0,
    evaluation_report TEXT,
    action_points TEXT,
    overall_opinion TEXT,
    severity TEXT,
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    UNIQUE(task_id, expert_role)
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    demo_mode INTEGER DEFAULT 0,
    anthropic_api_key TEXT,
    openai_api_key TEXT,
    github_token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    git_remote_url TEXT NOT NULL,
    git_branch TEXT DEFAULT 'main',
    git_last_commit TEXT,
    git_last_pull DATETIME,
    local_path TEXT NOT NULL UNIQUE,
    is_active INTEGER DEFAULT 0,
    framework TEXT,
    language TEXT,
    package_manager TEXT,
    clone_status TEXT DEFAULT 'pending',
    clone_error TEXT,
    last_sync_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (length(name) > 0 AND length(name) <= 100),
    CHECK (clone_status IN ('pending', 'cloning', 'ready', 'error'))
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_board ON tasks(board_id);
  CREATE INDEX IF NOT EXISTS idx_queue_status ON task_queue(status);
  CREATE INDEX IF NOT EXISTS idx_task_documents_task_id ON task_documents(task_id);
  CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);
  CREATE INDEX IF NOT EXISTS idx_project_documents_category ON project_documents(category);
  CREATE INDEX IF NOT EXISTS idx_presubmit_task_id ON presubmit_evaluations(task_id);
  CREATE INDEX IF NOT EXISTS idx_presubmit_status ON presubmit_evaluations(status);
  CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(is_active);
  CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
  CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(clone_status);

  -- ============================================
  -- Token Usage Tracking
  -- ============================================
  
  CREATE TABLE IF NOT EXISTS token_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CHECK (phase IN ('prompt_enhancement', 'implementation', 'refinement', 'presubmit', 'other')),
    CHECK (provider IN ('claude', 'openai', 'other'))
  );

  CREATE INDEX IF NOT EXISTS idx_token_usage_task_id ON token_usage(task_id);
  CREATE INDEX IF NOT EXISTS idx_token_usage_phase ON token_usage(phase);
  CREATE INDEX IF NOT EXISTS idx_token_usage_provider ON token_usage(provider);
  CREATE INDEX IF NOT EXISTS idx_token_usage_created_at ON token_usage(created_at);

  -- ============================================
  -- BMAD Workflow Builder Tables (v6 compatible)
  -- ============================================
  
  CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (status IN ('draft', 'active', 'archived')),
    CHECK (category IN ('development', 'testing', 'deployment', 'documentation', 'code-review', 'custom'))
  );

  CREATE TABLE IF NOT EXISTS workflow_executions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    status TEXT NOT NULL,
    result TEXT,
    logs TEXT,
    error TEXT,
    start_time DATETIME NOT NULL,
    end_time DATETIME,
    duration INTEGER,
    manifest_id TEXT,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    CHECK (status IN ('pending', 'running', 'success', 'failed', 'cancelled'))
  );

  CREATE TABLE IF NOT EXISTS execution_manifests (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    workflow_version INTEGER NOT NULL,
    execution_id TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    inputs TEXT NOT NULL,
    model_version TEXT NOT NULL,
    seed INTEGER,
    tools TEXT NOT NULL,
    outputs TEXT NOT NULL,
    reproducible INTEGER DEFAULT 1,
    phases TEXT,
    metrics TEXT,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
    FOREIGN KEY (execution_id) REFERENCES workflow_executions(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
  CREATE INDEX IF NOT EXISTS idx_workflows_category ON workflows(category);
  CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
  CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
  CREATE INDEX IF NOT EXISTS idx_execution_manifests_workflow ON execution_manifests(workflow_id);
  CREATE INDEX IF NOT EXISTS idx_execution_manifests_execution ON execution_manifests(execution_id);

  -- ============================================
  -- MCP Servers (Model Context Protocol)
  -- ============================================
  
  CREATE TABLE IF NOT EXISTS mcp_servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_name TEXT NOT NULL UNIQUE,
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
    last_test_at DATETIME,
    last_test_status TEXT,
    last_test_error TEXT,
    available_tools TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (protocol_type IN ('http', 'https', 'ws', 'wss', 'stdio')),
    CHECK (auth_type IN ('none', 'apiKey', 'bearer', 'oauth', 'basic')),
    CHECK (length(server_name) >= 1 AND length(server_name) <= 100),
    CHECK (length(description) <= 500)
  );

  CREATE INDEX IF NOT EXISTS idx_mcp_servers_active ON mcp_servers(is_active);
  CREATE INDEX IF NOT EXISTS idx_mcp_servers_name ON mcp_servers(server_name);

  -- ============================================
  -- Boards (migrated from IndexedDB)
  -- ============================================
  
  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    columns TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_boards_name ON boards(name);

  -- ============================================
  -- Comments (migrated from IndexedDB)
  -- ============================================
  
  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    task_id INTEGER NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_comments_task_id ON comments(task_id);
  CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

  -- ============================================
  -- Labels (migrated from IndexedDB)
  -- ============================================
  
  CREATE TABLE IF NOT EXISTS labels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_labels_name ON labels(name);

  -- ============================================
  -- Task Labels (Junction Table)
  -- ============================================
  
  CREATE TABLE IF NOT EXISTS task_labels (
    task_id INTEGER NOT NULL,
    label_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, label_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_task_labels_task ON task_labels(task_id);
  CREATE INDEX IF NOT EXISTS idx_task_labels_label ON task_labels(label_id);

  -- ============================================
  -- Webhook Events (migrated from IndexedDB)
  -- ============================================
  
  CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    payload TEXT NOT NULL,
    task_id INTEGER,
    processed INTEGER DEFAULT 0,
    processed_at DATETIME,
    error TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    CHECK (type IN ('push', 'pull_request', 'issue', 'comment', 'workflow_run'))
  );

  CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(type);
  CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
  CREATE INDEX IF NOT EXISTS idx_webhook_events_task_id ON webhook_events(task_id);

  -- ============================================
  -- Automation Rules (migrated from IndexedDB)
  -- ============================================
  
  CREATE TABLE IF NOT EXISTS automation_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    trigger_type TEXT NOT NULL,
    trigger_config TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_config TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    description TEXT,
    last_triggered_at DATETIME,
    trigger_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (trigger_type IN ('webhook', 'status_change', 'schedule', 'label', 'comment')),
    CHECK (action_type IN ('move_task', 'add_label', 'notify', 'webhook', 'comment', 'assign'))
  );

  CREATE INDEX IF NOT EXISTS idx_automation_rules_enabled ON automation_rules(enabled);
  CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger_type ON automation_rules(trigger_type);

  -- ============================================
  -- Integration Configs (migrated from localStorage)
  -- ============================================
  
  CREATE TABLE IF NOT EXISTS integration_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    integration_type TEXT NOT NULL UNIQUE,
    config TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    last_sync_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (integration_type IN ('github', 'gitlab', 'jira', 'slack'))
  );

  CREATE INDEX IF NOT EXISTS idx_integration_configs_type ON integration_configs(integration_type);

  -- ============================================
  -- TDD Agentic Development Board Tables
  -- ============================================

  -- TDD-specific tasks (references main tasks table)
  CREATE TABLE IF NOT EXISTS tdd_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL UNIQUE,
    tdd_status TEXT NOT NULL DEFAULT 'backlog',
    specification TEXT,
    acceptance_criteria TEXT,
    test_code TEXT,
    implementation_code TEXT,
    test_results TEXT,
    tdd_cycle_count INTEGER DEFAULT 0,
    current_phase TEXT DEFAULT 'spec_elicitation',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
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

  -- Agent state serialization for pause/resume
  CREATE TABLE IF NOT EXISTS tdd_agent_state (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tdd_task_id INTEGER NOT NULL,
    state_file_path TEXT NOT NULL,
    checkpoint_name TEXT NOT NULL,
    agent_context TEXT,
    paused_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resumed_at DATETIME,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (tdd_task_id) REFERENCES tdd_tasks(id) ON DELETE CASCADE
  );

  -- User clarification Q&A records
  CREATE TABLE IF NOT EXISTS tdd_clarifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tdd_task_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'text',
    suggested_options TEXT,
    user_answer TEXT,
    answer_type TEXT,
    answered_at DATETIME,
    agent_state_id INTEGER,
    required INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tdd_task_id) REFERENCES tdd_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_state_id) REFERENCES tdd_agent_state(id) ON DELETE SET NULL,
    CHECK (question_type IN ('text', 'choice', 'multi_choice', 'boolean'))
  );

  -- External skills manifest from superpowers repository
  CREATE TABLE IF NOT EXISTS external_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_name TEXT NOT NULL UNIQUE,
    skill_path TEXT NOT NULL,
    description TEXT,
    activation_triggers TEXT,
    skill_content TEXT NOT NULL,
    version TEXT,
    is_core INTEGER DEFAULT 0,
    has_checklist INTEGER DEFAULT 0,
    has_diagrams INTEGER DEFAULT 0,
    has_examples INTEGER DEFAULT 0,
    last_synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1,
    source_repo TEXT DEFAULT 'obra/superpowers'
  );

  -- TDD execution logs (per phase)
  CREATE TABLE IF NOT EXISTS tdd_execution_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tdd_task_id INTEGER NOT NULL,
    phase TEXT NOT NULL,
    skill_used TEXT,
    input_context TEXT,
    output_result TEXT,
    test_output TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    elapsed_seconds INTEGER DEFAULT 0,
    success INTEGER DEFAULT 0,
    error TEXT,
    FOREIGN KEY (tdd_task_id) REFERENCES tdd_tasks(id) ON DELETE CASCADE,
    CHECK (phase IN ('spec_elicitation', 'red_phase', 'green_phase', 'refactor_phase', 'verification'))
  );

  -- TDD test results tracking
  CREATE TABLE IF NOT EXISTS tdd_test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tdd_task_id) REFERENCES tdd_tasks(id) ON DELETE CASCADE,
    CHECK (phase IN ('red', 'green', 'refactor'))
  );

  -- TDD Indexes
  CREATE INDEX IF NOT EXISTS idx_tdd_tasks_status ON tdd_tasks(tdd_status);
  CREATE INDEX IF NOT EXISTS idx_tdd_tasks_phase ON tdd_tasks(current_phase);
  CREATE INDEX IF NOT EXISTS idx_tdd_tasks_task_id ON tdd_tasks(task_id);
  CREATE INDEX IF NOT EXISTS idx_tdd_state_task ON tdd_agent_state(tdd_task_id);
  CREATE INDEX IF NOT EXISTS idx_tdd_state_active ON tdd_agent_state(is_active);
  CREATE INDEX IF NOT EXISTS idx_tdd_clarifications_task ON tdd_clarifications(tdd_task_id);
  CREATE INDEX IF NOT EXISTS idx_tdd_clarifications_unanswered ON tdd_clarifications(answered_at);
  CREATE INDEX IF NOT EXISTS idx_external_skills_name ON external_skills(skill_name);
  CREATE INDEX IF NOT EXISTS idx_external_skills_active ON external_skills(is_active);
  CREATE INDEX IF NOT EXISTS idx_external_skills_core ON external_skills(is_core);
  CREATE INDEX IF NOT EXISTS idx_tdd_logs_task ON tdd_execution_logs(tdd_task_id);
  CREATE INDEX IF NOT EXISTS idx_tdd_test_results_task ON tdd_test_results(tdd_task_id);

  -- ============================================
  -- Agentic Dev Workflow Board Tables
  -- ============================================

  -- Project Groups (multi-repo orchestration)
  CREATE TABLE IF NOT EXISTS project_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Project Group Members (projects in a group)
  CREATE TABLE IF NOT EXISTS project_group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    is_primary INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES project_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(group_id, project_id)
  );

  -- Global Documents
  CREATE TABLE IF NOT EXISTS global_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    tags TEXT,
    uploaded_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Agentic Tasks (main task record)
  CREATE TABLE IF NOT EXISTS agentic_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    phase TEXT NOT NULL DEFAULT 'idle',
    priority TEXT NOT NULL DEFAULT 'medium',

    -- Project Group association
    project_group_id INTEGER,

    -- Brainstorming context (analysis, recommendations from brainstorming phase)
    brainstorming_context TEXT,

    -- Configuration
    auto_advance INTEGER DEFAULT 1,
    error_handling TEXT DEFAULT 'smart_recovery',
    execution_strategy TEXT DEFAULT 'subagent_per_step',
    code_review_point TEXT DEFAULT 'before_verification',

    -- MCP Configuration (JSON)
    mcp_servers_config TEXT,

    -- Verification Commands (JSON array)
    verification_commands TEXT,

    -- Reference past tasks (JSON array of task IDs)
    reference_task_ids TEXT,

    -- Token usage tracking
    total_input_tokens INTEGER DEFAULT 0,
    total_output_tokens INTEGER DEFAULT 0,
    total_cost_usd REAL DEFAULT 0,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (project_group_id) REFERENCES project_groups(id) ON DELETE SET NULL,
    CHECK (status IN ('todo', 'brainstorming', 'clarifying', 'planning', 'plan-review', 'in-progress', 'verifying', 'done')),
    CHECK (phase IN ('idle', 'brainstorming', 'awaiting_clarification', 'planning', 'awaiting_plan_review', 'executing', 'reviewing', 'verifying', 'complete')),
    CHECK (error_handling IN ('auto_retry', 'immediate_pause', 'smart_recovery')),
    CHECK (execution_strategy IN ('single_agent', 'subagent_per_step', 'batched_checkpoint')),
    CHECK (code_review_point IN ('never', 'after_step', 'after_batch', 'before_verification'))
  );

  -- Agentic Task Documents (junction table for global/uploaded/reference docs)
  CREATE TABLE IF NOT EXISTS agentic_task_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    document_type TEXT NOT NULL,
    document_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES agentic_tasks(id) ON DELETE CASCADE,
    CHECK (document_type IN ('global', 'uploaded', 'reference'))
  );

  -- Agentic Task Uploaded Documents
  CREATE TABLE IF NOT EXISTS agentic_task_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES agentic_tasks(id) ON DELETE CASCADE
  );

  -- Clarification Questions & Answers
  CREATE TABLE IF NOT EXISTS agentic_clarifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'choice',
    suggested_options TEXT,
    user_answer TEXT,
    answer_type TEXT,
    answered_at DATETIME,
    required INTEGER DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES agentic_tasks(id) ON DELETE CASCADE,
    CHECK (question_type IN ('text', 'choice', 'multi_choice', 'boolean'))
  );

  -- Implementation Plans
  CREATE TABLE IF NOT EXISTS agentic_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL UNIQUE,
    goal TEXT,
    architecture TEXT,
    tech_stack TEXT,
    plan_content TEXT NOT NULL,
    plan_steps TEXT NOT NULL,
    user_modified INTEGER DEFAULT 0,
    approved INTEGER DEFAULT 0,
    approved_at DATETIME,
    version INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES agentic_tasks(id) ON DELETE CASCADE
  );

  -- Plan Step Execution Tracking
  CREATE TABLE IF NOT EXISTS agentic_plan_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    step_index INTEGER NOT NULL,
    step_content TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    started_at DATETIME,
    completed_at DATETIME,
    output TEXT,
    error TEXT,
    review_status TEXT,
    review_notes TEXT,
    FOREIGN KEY (plan_id) REFERENCES agentic_plans(id) ON DELETE CASCADE,
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
    CHECK (review_status IN (NULL, 'pending', 'approved', 'rejected', 'needs_changes'))
  );

  -- Git Worktrees per Task per Project
  CREATE TABLE IF NOT EXISTS agentic_worktrees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    worktree_path TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    base_branch TEXT NOT NULL,
    status TEXT DEFAULT 'created',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    merged_at DATETIME,
    deleted_at DATETIME,
    FOREIGN KEY (task_id) REFERENCES agentic_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(task_id, project_id),
    CHECK (status IN ('created', 'active', 'pr_created', 'merged', 'rolled_back', 'deleted'))
  );

  -- Coordinated Pull Requests
  CREATE TABLE IF NOT EXISTS agentic_pull_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    pr_group_id TEXT NOT NULL,
    project_id INTEGER NOT NULL,
    worktree_id INTEGER NOT NULL,
    pr_number INTEGER,
    pr_url TEXT,
    pr_title TEXT,
    pr_body TEXT,
    pr_status TEXT DEFAULT 'draft',
    merged_at DATETIME,
    rollback_branch TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES agentic_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (worktree_id) REFERENCES agentic_worktrees(id) ON DELETE CASCADE,
    CHECK (pr_status IN ('draft', 'open', 'approved', 'merged', 'closed', 'rolled_back'))
  );

  -- Verification Results
  CREATE TABLE IF NOT EXISTS agentic_verifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    check_name TEXT NOT NULL,
    check_command TEXT NOT NULL,
    project_id INTEGER,
    status TEXT DEFAULT 'pending',
    exit_code INTEGER,
    stdout TEXT,
    stderr TEXT,
    duration_ms INTEGER,
    executed_at DATETIME,
    FOREIGN KEY (task_id) REFERENCES agentic_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CHECK (status IN ('pending', 'running', 'passed', 'failed', 'skipped'))
  );

  -- Execution Logs (for real-time streaming display)
  CREATE TABLE IF NOT EXISTS agentic_execution_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    phase TEXT NOT NULL,
    step_id INTEGER,
    log_type TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES agentic_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (step_id) REFERENCES agentic_plan_steps(id) ON DELETE SET NULL,
    CHECK (log_type IN ('info', 'progress', 'tool', 'error', 'success', 'warning'))
  );

  -- Task History Archive (for completed tasks)
  CREATE TABLE IF NOT EXISTS agentic_task_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    archived_data TEXT NOT NULL,
    context_summary TEXT,
    final_status TEXT NOT NULL,
    pr_group_info TEXT,
    rollback_info TEXT,
    archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES agentic_tasks(id) ON DELETE CASCADE
  );

  -- Slack Notification Config (per project group)
  CREATE TABLE IF NOT EXISTS slack_notification_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_group_id INTEGER,
    webhook_url TEXT NOT NULL,
    notify_phase_changes INTEGER DEFAULT 1,
    notify_user_action INTEGER DEFAULT 1,
    notify_completion INTEGER DEFAULT 1,
    notify_errors INTEGER DEFAULT 1,
    include_token_usage INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_group_id) REFERENCES project_groups(id) ON DELETE CASCADE
  );

  -- Board Visibility Settings
  CREATE TABLE IF NOT EXISTS board_visibility (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_name TEXT NOT NULL UNIQUE,
    is_visible INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Agentic Workflow Indexes
  CREATE INDEX IF NOT EXISTS idx_project_groups_name ON project_groups(name);
  CREATE INDEX IF NOT EXISTS idx_project_group_members_group ON project_group_members(group_id);
  CREATE INDEX IF NOT EXISTS idx_project_group_members_project ON project_group_members(project_id);
  CREATE INDEX IF NOT EXISTS idx_global_documents_category ON global_documents(category);
  CREATE INDEX IF NOT EXISTS idx_agentic_tasks_status ON agentic_tasks(status);
  CREATE INDEX IF NOT EXISTS idx_agentic_tasks_phase ON agentic_tasks(phase);
  CREATE INDEX IF NOT EXISTS idx_agentic_tasks_group ON agentic_tasks(project_group_id);
  CREATE INDEX IF NOT EXISTS idx_agentic_clarifications_task ON agentic_clarifications(task_id);
  CREATE INDEX IF NOT EXISTS idx_agentic_clarifications_unanswered ON agentic_clarifications(answered_at);
  CREATE INDEX IF NOT EXISTS idx_agentic_plans_task ON agentic_plans(task_id);
  CREATE INDEX IF NOT EXISTS idx_agentic_plan_steps_plan ON agentic_plan_steps(plan_id);
  CREATE INDEX IF NOT EXISTS idx_agentic_worktrees_task ON agentic_worktrees(task_id);
  CREATE INDEX IF NOT EXISTS idx_agentic_prs_task ON agentic_pull_requests(task_id);
  CREATE INDEX IF NOT EXISTS idx_agentic_prs_group ON agentic_pull_requests(pr_group_id);
  CREATE INDEX IF NOT EXISTS idx_agentic_verifications_task ON agentic_verifications(task_id);
  CREATE INDEX IF NOT EXISTS idx_agentic_logs_task ON agentic_execution_logs(task_id);
  CREATE INDEX IF NOT EXISTS idx_agentic_logs_phase ON agentic_execution_logs(phase);
  CREATE INDEX IF NOT EXISTS idx_agentic_history_task ON agentic_task_history(task_id);
  CREATE INDEX IF NOT EXISTS idx_slack_config_group ON slack_notification_config(project_group_id);
  CREATE INDEX IF NOT EXISTS idx_board_visibility_name ON board_visibility(board_name);
`);

// Ensure only one active project at a time
db.exec(`
  CREATE TRIGGER IF NOT EXISTS ensure_single_active_project
  BEFORE UPDATE ON projects
  WHEN NEW.is_active = 1
  BEGIN
    UPDATE projects SET is_active = 0 WHERE is_active = 1 AND id != NEW.id;
  END;
`);

// Insert default settings row if it doesn't exist
db.exec(`INSERT OR IGNORE INTO app_settings (id, demo_mode) VALUES (1, 0);`);

// Insert default board visibility settings (agentic visible, others hidden)
db.exec(`
  INSERT OR IGNORE INTO board_visibility (board_name, is_visible, display_order) VALUES
    ('agentic-workflow-board', 1, 0),
    ('dev-board', 0, 1),
    ('tdd-board', 0, 2);
`);

// Migration: Add anthropic_api_key column if it doesn't exist
try {
  db.exec(`ALTER TABLE app_settings ADD COLUMN anthropic_api_key TEXT;`);
  console.log('✅ Migration: Added anthropic_api_key column');
} catch (error: any) {
  // Column already exists, that's fine
  if (!error.message.includes('duplicate column name')) {
    console.warn('Migration warning:', error.message);
  }
}

// Migration: Add board_name and sidebar_title columns if they don't exist
try {
  db.exec(`ALTER TABLE app_settings ADD COLUMN board_name TEXT DEFAULT 'Dev Automation Board';`);
  console.log('✅ Migration: Added board_name column');
} catch (error: any) {
  if (!error.message.includes('duplicate column name')) {
    console.warn('Migration warning:', error.message);
  }
}

try {
  db.exec(`ALTER TABLE app_settings ADD COLUMN sidebar_title TEXT DEFAULT 'LuckyVR Factory';`);
  console.log('✅ Migration: Added sidebar_title column');
} catch (error: any) {
  if (!error.message.includes('duplicate column name')) {
    console.warn('Migration warning:', error.message);
  }
}

// Migration: Add openai_api_key column if it doesn't exist
try {
  db.exec(`ALTER TABLE app_settings ADD COLUMN openai_api_key TEXT;`);
  console.log('✅ Migration: Added openai_api_key column');
} catch (error: any) {
  if (!error.message.includes('duplicate column name')) {
    console.warn('Migration warning:', error.message);
  }
}

// Migration: Add context7_api_key column if it doesn't exist
try {
  db.exec(`ALTER TABLE app_settings ADD COLUMN context7_api_key TEXT;`);
  console.log('✅ Migration: Added context7_api_key column');
} catch (error: any) {
  if (!error.message.includes('duplicate column name')) {
    console.warn('Migration warning:', error.message);
  }
}

// Migration: Add gitlab_token column if it doesn't exist
try {
  db.exec(`ALTER TABLE app_settings ADD COLUMN gitlab_token TEXT;`);
  console.log('✅ Migration: Added gitlab_token column');
} catch (error: any) {
  if (!error.message.includes('duplicate column name')) {
    console.warn('Migration warning:', error.message);
  }
}

// Migration: Add jira_config column if it doesn't exist
try {
  db.exec(`ALTER TABLE app_settings ADD COLUMN jira_config TEXT;`);
  console.log('✅ Migration: Added jira_config column');
} catch (error: any) {
  if (!error.message.includes('duplicate column name')) {
    console.warn('Migration warning:', error.message);
  }
}

// Migration: Add slack_webhook column if it doesn't exist
try {
  db.exec(`ALTER TABLE app_settings ADD COLUMN slack_webhook TEXT;`);
  console.log('✅ Migration: Added slack_webhook column');
} catch (error: any) {
  if (!error.message.includes('duplicate column name')) {
    console.warn('Migration warning:', error.message);
  }
}

// Migration: Add framework column to workflows table if it doesn't exist
try {
  db.exec(`
    ALTER TABLE workflows ADD COLUMN framework TEXT NOT NULL DEFAULT 'bmad';
    CREATE INDEX IF NOT EXISTS idx_workflows_framework ON workflows(framework);
  `);
  console.log('✅ Migration: Added framework column to workflows');
} catch (error: any) {
  if (!error.message.includes('duplicate column name') && !error.message.includes('no such table')) {
    console.warn('Workflows migration warning:', error.message);
  }
}

// Migration: Add workflow_ids column to tasks table if it doesn't exist
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN workflow_ids TEXT;`);
  console.log('✅ Migration: Added workflow_ids column to tasks');
} catch (error: any) {
  if (!error.message.includes('duplicate column name')) {
    console.warn('Migration warning:', error.message);
  }
}

// Migration: Add use_context7 column to tasks table if it doesn't exist
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN use_context7 INTEGER DEFAULT 1;`);
  console.log('✅ Migration: Added use_context7 column to tasks');
} catch (error: any) {
  if (!error.message.includes('duplicate column name')) {
    console.warn('Migration warning:', error.message);
  }
}

// Migration: Add use_confluence column to tasks table if it doesn't exist
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN use_confluence INTEGER DEFAULT 1;`);
  console.log('✅ Migration: Added use_confluence column to tasks');
} catch (error: any) {
  if (!error.message.includes('duplicate column name')) {
    console.warn('Migration warning:', error.message);
  }
}

// Migration: Add refinement support columns to task_implementation
try {
  db.exec(`ALTER TABLE task_implementation ADD COLUMN refinement_round INTEGER DEFAULT 1;`);
  console.log('✅ Migration: Added refinement_round column to task_implementation');
} catch (error: any) {
  if (!error.message.includes('duplicate column name')) {
    console.warn('Migration warning:', error.message);
  }
}

try {
  db.exec(`ALTER TABLE task_implementation ADD COLUMN refinement_feedback TEXT;`);
  console.log('✅ Migration: Added refinement_feedback column to task_implementation');
} catch (error: any) {
  if (!error.message.includes('duplicate column name')) {
    console.warn('Migration warning:', error.message);
  }
}

try {
  db.exec(`ALTER TABLE task_implementation ADD COLUMN refinement_status TEXT DEFAULT 'idle';`);
  console.log('✅ Migration: Added refinement_status column to task_implementation');
} catch (error: any) {
  if (!error.message.includes('duplicate column name')) {
    console.warn('Migration warning:', error.message);
  }
}

try {
  db.exec(`ALTER TABLE task_implementation ADD COLUMN priority TEXT;`);
  console.log('✅ Migration: Added priority column to task_implementation');
} catch (error: any) {
  if (!error.message.includes('duplicate column name')) {
    console.warn('Migration warning:', error.message);
  }
}

// Copy priority from tasks table to existing implementations
try {
  db.exec(`
    UPDATE task_implementation 
    SET priority = (
      SELECT priority FROM tasks WHERE tasks.id = task_implementation.task_id
    )
    WHERE priority IS NULL;
  `);
  console.log('✅ Migration: Copied priorities to task_implementation');
} catch (error: any) {
  console.warn('Migration warning:', error.message);
}

// Migration: Upgrade mcp_servers table for universal support
try {
  const tableInfo = db.prepare("PRAGMA table_info(mcp_servers)").all() as any[];
  const hasServerArgs = tableInfo.some((col: any) => col.name === 'server_args');
  
  if (!hasServerArgs) {
    console.log('🔄 Migrating mcp_servers table...');
    
    db.transaction(() => {
      // 1. Rename old table
      db.exec("ALTER TABLE mcp_servers RENAME TO mcp_servers_old");
      
      // 2. Create new table
      db.exec(`
        CREATE TABLE mcp_servers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          server_name TEXT NOT NULL UNIQUE,
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
          last_test_at DATETIME,
          last_test_status TEXT,
          last_test_error TEXT,
          available_tools TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          CHECK (protocol_type IN ('http', 'https', 'ws', 'wss', 'stdio')),
          CHECK (auth_type IN ('none', 'apiKey', 'bearer', 'oauth', 'basic')),
          CHECK (length(server_name) >= 1 AND length(server_name) <= 100),
          CHECK (length(description) <= 500)
        )
      `);
      
      // 3. Copy data
      // Note: we don't copy new columns as they didn't exist
      db.exec(`
        INSERT INTO mcp_servers (
          id, server_name, description, version, server_address, port, 
          protocol_type, connection_path, auth_type, auth_token, 
          auth_key_name, additional_headers, is_active, last_test_at, 
          last_test_status, last_test_error, available_tools, created_at, updated_at
        )
        SELECT 
          id, server_name, description, version, server_address, port, 
          protocol_type, connection_path, auth_type, auth_token, 
          auth_key_name, additional_headers, is_active, last_test_at, 
          last_test_status, last_test_error, available_tools, created_at, updated_at
        FROM mcp_servers_old
      `);
      
      // 4. Drop old table
      db.exec("DROP TABLE mcp_servers_old");
      
      // 5. Recreate indexes
      db.exec("CREATE INDEX IF NOT EXISTS idx_mcp_servers_active ON mcp_servers(is_active)");
      db.exec("CREATE INDEX IF NOT EXISTS idx_mcp_servers_name ON mcp_servers(server_name)");
    })();
    
    console.log('✅ Migration: Upgraded mcp_servers table');
  }
} catch (error: any) {
  console.error('Migration error (mcp_servers):', error.message);
}

}  // End isInBuildPhase check

// Prepared statements for better performance (stub during build)
export const statements = isInBuildPhase() ? {} as any : {
  createTask: db.prepare(`
    INSERT INTO tasks (title, description, status, priority, board_id, reference_task_ids, workflow_ids, use_context7, use_confluence)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getTask: db.prepare('SELECT * FROM tasks WHERE id = ?'),

  getAllTasks: db.prepare('SELECT * FROM tasks ORDER BY created_at DESC'),

  getTasksByBoard: db.prepare('SELECT * FROM tasks WHERE board_id = ? ORDER BY created_at DESC'),

  updateTaskStatus: db.prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'),

  deleteTask: db.prepare('DELETE FROM tasks WHERE id = ?'),

  // Workflow statements
  // Create workflow (will be dynamically selected based on schema)
  get createWorkflow() {
    // Check if framework column exists
    try {
      const tableInfo = db.prepare("PRAGMA table_info(workflows)").all() as any[];
      const hasFramework = tableInfo.some((col: any) => col.name === 'framework');
      
      if (hasFramework) {
        return db.prepare(`
          INSERT INTO workflows (id, name, description, framework, nl_input, yaml_definition, command_file, category, status, version, tags, icon)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
      } else {
        return db.prepare(`
          INSERT INTO workflows (id, name, description, nl_input, yaml_definition, command_file, category, status, version, tags, icon)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
      }
    } catch {
      // Table doesn't exist yet, return dummy
      return { run: () => {} } as any;
    }
  },
  
  createWorkflowLegacy: db.prepare(`
    INSERT INTO workflows (id, name, description, nl_input, yaml_definition, command_file, category, status, version, tags, icon)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getAllWorkflows: db.prepare('SELECT * FROM workflows ORDER BY created_at DESC'),

  getWorkflow: db.prepare('SELECT * FROM workflows WHERE id = ?'),

  getWorkflowByName: db.prepare('SELECT * FROM workflows WHERE name = ?'),

  updateWorkflow: db.prepare(`
    UPDATE workflows 
    SET description = ?, yaml_definition = ?, command_file = ?, category = ?, status = ?, version = version + 1, tags = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  deleteWorkflow: db.prepare('DELETE FROM workflows WHERE id = ?'),

  createExecution: db.prepare(`
    INSERT INTO workflow_executions (id, workflow_id, status, start_time)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `),

  updateExecution: db.prepare(`
    UPDATE workflow_executions
    SET status = ?, result = ?, logs = ?, error = ?, end_time = CURRENT_TIMESTAMP, duration = ?
    WHERE id = ?
  `),

  getExecutionsByWorkflow: db.prepare('SELECT * FROM workflow_executions WHERE workflow_id = ? ORDER BY start_time DESC'),

  addQuestion: db.prepare(`
    INSERT INTO task_questions (task_id, question)
    VALUES (?, ?)
  `),

  answerQuestion: db.prepare(`
    UPDATE task_questions SET answer = ? WHERE id = ?
  `),

  getQuestions: db.prepare('SELECT * FROM task_questions WHERE task_id = ? ORDER BY created_at'),

  createPrompt: db.prepare(`
    INSERT INTO task_prompts (task_id, original_description)
    VALUES (?, ?)
  `),

  updatePrompt: db.prepare(`
    UPDATE task_prompts
    SET enhanced_prompt = ?, status = 'completed', updated_at = CURRENT_TIMESTAMP
    WHERE task_id = ?
  `),

  approvePrompt: db.prepare(`
    UPDATE task_prompts
    SET approved = 1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE task_id = ?
  `),

  setPromptRefinementStatus: db.prepare(`
    UPDATE task_prompts
    SET refinement_status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE task_id = ?
  `),

  resetPromptApproval: db.prepare(`
    UPDATE task_prompts
    SET approved = 0, approved_at = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE task_id = ?
  `),

  getPrompt: db.prepare('SELECT * FROM task_prompts WHERE task_id = ? ORDER BY created_at DESC LIMIT 1'),

  enqueueTask: db.prepare(`
    INSERT INTO task_queue (task_id, status)
    VALUES (?, 'pending')
  `),

  getPendingQueueItems: db.prepare(`
    SELECT * FROM task_queue
    WHERE status = 'pending'
    ORDER BY created_at
    LIMIT 10
  `),

  getQueueItemByTaskId: db.prepare(`
    SELECT * FROM task_queue
    WHERE task_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `),

  updateQueueStatus: db.prepare(`
    UPDATE task_queue
    SET status = ?, processed_at = CURRENT_TIMESTAMP, error = ?
    WHERE id = ?
  `),

  cancelQueueItemsForTask: db.prepare(`
    UPDATE task_queue 
    SET status = 'cancelled', processed_at = CURRENT_TIMESTAMP
    WHERE task_id = ? AND status = 'pending'
  `),

  // Implementation tracking
  createImplementation: db.prepare(`
    INSERT INTO task_implementation (task_id, status, git_restore_point, priority)
    VALUES (?, ?, ?, ?)
  `),

  getImplementation: db.prepare(`
    SELECT * FROM task_implementation WHERE task_id = ?
  `),

  updateImplementationStatus: db.prepare(`
    UPDATE task_implementation
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE task_id = ?
  `),

  startImplementation: db.prepare(`
    UPDATE task_implementation
    SET status = 'running', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE task_id = ?
  `),

  completeImplementation: db.prepare(`
    UPDATE task_implementation
    SET status = 'completed', completed_at = CURRENT_TIMESTAMP, 
        elapsed_seconds = ?, git_commit_hash = ?, updated_at = CURRENT_TIMESTAMP
    WHERE task_id = ?
  `),

  getActiveImplementation: db.prepare(`
    SELECT * FROM task_implementation 
    WHERE status = 'running' 
    LIMIT 1
  `),

  getWaitingImplementations: db.prepare(`
    SELECT ti.* FROM task_implementation ti
    JOIN tasks t ON ti.task_id = t.id
    WHERE ti.status = 'waiting'
    ORDER BY 
      CASE COALESCE(ti.priority, t.priority)
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
        ELSE 5
      END,
      ti.created_at ASC
  `),

  updateImplementationRefinement: db.prepare(`
    UPDATE task_implementation
    SET refinement_status = ?, 
        refinement_round = ?,
        refinement_feedback = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE task_id = ?
  `),

  // Document operations
  createDocument: db.prepare(`
    INSERT INTO task_documents (task_id, filename, original_filename, file_path, file_size, mime_type, url, uploaded_by, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getTaskDocuments: db.prepare(`
    SELECT * FROM task_documents
    WHERE task_id = ?
    ORDER BY uploaded_at DESC
  `),

  getDocument: db.prepare(`
    SELECT * FROM task_documents
    WHERE id = ?
  `),

  deleteDocument: db.prepare(`
    DELETE FROM task_documents
    WHERE id = ?
  `),

  updateDocumentDescription: db.prepare(`
    UPDATE task_documents
    SET description = ?
    WHERE id = ?
  `),

  // Project document operations
  createProjectDocument: db.prepare(`
    INSERT INTO project_documents (project_id, filename, original_filename, file_path, file_size, mime_type, url, uploaded_by, description, category, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getProjectDocuments: db.prepare(`
    SELECT * FROM project_documents
    WHERE project_id = ?
    ORDER BY uploaded_at DESC
  `),

  getProjectDocument: db.prepare(`
    SELECT * FROM project_documents
    WHERE id = ?
  `),

  deleteProjectDocument: db.prepare(`
    DELETE FROM project_documents
    WHERE id = ?
  `),

  updateProjectDocumentDescription: db.prepare(`
    UPDATE project_documents
    SET description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  updateProjectDocumentCategory: db.prepare(`
    UPDATE project_documents
    SET category = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  updateProjectDocumentTags: db.prepare(`
    UPDATE project_documents
    SET tags = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  // Implementation report operations
  saveImplementationReport: db.prepare(`
    UPDATE task_implementation
    SET implementation_report = ?, report_status = 'completed', 
        report_generated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE task_id = ?
  `),

  updateReportStatus: db.prepare(`
    UPDATE task_implementation
    SET report_status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE task_id = ?
  `),

  // Presubmit evaluation operations
  createPresubmitEvaluation: db.prepare(`
    INSERT INTO presubmit_evaluations (task_id, expert_role, status)
    VALUES (?, ?, 'pending')
  `),

  getPresubmitEvaluations: db.prepare(`
    SELECT * FROM presubmit_evaluations
    WHERE task_id = ?
    ORDER BY expert_role
  `),

  getPresubmitEvaluation: db.prepare(`
    SELECT * FROM presubmit_evaluations
    WHERE task_id = ? AND expert_role = ?
  `),

  startPresubmitEvaluation: db.prepare(`
    UPDATE presubmit_evaluations
    SET status = 'running', started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE task_id = ? AND expert_role = ?
  `),

  completePresubmitEvaluation: db.prepare(`
    UPDATE presubmit_evaluations
    SET status = 'completed', completed_at = CURRENT_TIMESTAMP,
        elapsed_seconds = ?, evaluation_report = ?, action_points = ?,
        overall_opinion = ?, severity = ?, updated_at = CURRENT_TIMESTAMP
    WHERE task_id = ? AND expert_role = ?
  `),

  failPresubmitEvaluation: db.prepare(`
    UPDATE presubmit_evaluations
    SET status = 'error', error = ?, updated_at = CURRENT_TIMESTAMP
    WHERE task_id = ? AND expert_role = ?
  `),

  // Team ruleset operations
  createTeamRuleset: db.prepare(`
    INSERT INTO team_rulesets (name, description, version, body, when_apply, resources, dependencies)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),

  getAllTeamRulesets: db.prepare(`
    SELECT * FROM team_rulesets
    ORDER BY updated_at DESC
  `),

  getTeamRuleset: db.prepare(`
    SELECT * FROM team_rulesets WHERE id = ?
  `),

  getTeamRulesetByName: db.prepare(`
    SELECT * FROM team_rulesets WHERE name = ?
  `),

  updateTeamRuleset: db.prepare(`
    UPDATE team_rulesets
    SET name = ?, description = ?, version = ?, body = ?, when_apply = ?, 
        resources = ?, dependencies = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  deleteTeamRuleset: db.prepare(`
    DELETE FROM team_rulesets WHERE id = ?
  `),

  toggleTeamRuleset: db.prepare(`
    UPDATE team_rulesets
    SET enabled = NOT enabled, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  getEnabledTeamRulesets: db.prepare(`
    SELECT * FROM team_rulesets
    WHERE enabled = 1
    ORDER BY name
  `),

  // App settings operations
  getAppSettings: db.prepare(`
    SELECT * FROM app_settings WHERE id = 1
  `),

  updateDemoMode: db.prepare(`
    UPDATE app_settings
    SET demo_mode = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `),

  updateApiKey: db.prepare(`
    UPDATE app_settings
    SET anthropic_api_key = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `),

  updateOpenAiApiKey: db.prepare(`
    UPDATE app_settings
    SET openai_api_key = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `),

  updateGitHubToken: db.prepare(`
    UPDATE app_settings
    SET github_token = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `),

  updateContext7ApiKey: db.prepare(`
    UPDATE app_settings
    SET context7_api_key = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `),

  updateCustomization: db.prepare(`
    UPDATE app_settings
    SET board_name = ?, sidebar_title = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `),

  // Project management operations
  createProject: db.prepare(`
    INSERT INTO projects (name, description, git_remote_url, git_branch, local_path, clone_status)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  getProject: db.prepare('SELECT * FROM projects WHERE id = ?'),

  getProjectByName: db.prepare('SELECT * FROM projects WHERE name = ?'),

  getAllProjects: db.prepare('SELECT * FROM projects ORDER BY created_at DESC'),

  getActiveProject: db.prepare('SELECT * FROM projects WHERE is_active = 1 LIMIT 1'),

  activateProject: db.prepare(`
    UPDATE projects SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `),

  deactivateAllProjects: db.prepare(`
    UPDATE projects SET is_active = 0, updated_at = CURRENT_TIMESTAMP
  `),

  updateProjectStatus: db.prepare(`
    UPDATE projects 
    SET clone_status = ?, clone_error = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `),

  updateProjectInfo: db.prepare(`
    UPDATE projects 
    SET framework = ?, language = ?, package_manager = ?, git_last_commit = ?, 
        clone_status = ?, clone_error = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  updateProjectGitInfo: db.prepare(`
    UPDATE projects 
    SET git_last_commit = ?, git_last_pull = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  deleteProject: db.prepare('DELETE FROM projects WHERE id = ?'),

  // MCP Server operations
  createMcpServer: db.prepare(`
    INSERT INTO mcp_servers (
      server_name, description, version, server_address, port, protocol_type,
      connection_path, auth_type, auth_token, auth_key_name, additional_headers,
      server_args, server_env
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getMcpServer: db.prepare('SELECT * FROM mcp_servers WHERE id = ?'),

  getMcpServerByName: db.prepare('SELECT * FROM mcp_servers WHERE server_name = ?'),

  getAllMcpServers: db.prepare('SELECT * FROM mcp_servers ORDER BY created_at DESC'),

  getActiveMcpServers: db.prepare('SELECT * FROM mcp_servers WHERE is_active = 1 ORDER BY server_name'),

  updateMcpServer: db.prepare(`
    UPDATE mcp_servers
    SET server_name = ?, description = ?, version = ?, server_address = ?,
        port = ?, protocol_type = ?, connection_path = ?, auth_type = ?,
        auth_token = ?, auth_key_name = ?, additional_headers = ?,
        server_args = ?, server_env = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  updateMcpServerTestResult: db.prepare(`
    UPDATE mcp_servers
    SET last_test_at = CURRENT_TIMESTAMP, last_test_status = ?,
        last_test_error = ?, available_tools = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  toggleMcpServerActive: db.prepare(`
    UPDATE mcp_servers
    SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  deleteMcpServer: db.prepare('DELETE FROM mcp_servers WHERE id = ?'),

  // ============================================
  // Boards operations
  // ============================================
  
  createBoard: db.prepare(`
    INSERT INTO boards (id, name, description, columns)
    VALUES (?, ?, ?, ?)
  `),

  getAllBoards: db.prepare('SELECT * FROM boards ORDER BY created_at DESC'),

  getBoard: db.prepare('SELECT * FROM boards WHERE id = ?'),

  updateBoard: db.prepare(`
    UPDATE boards 
    SET name = ?, description = ?, columns = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  deleteBoard: db.prepare('DELETE FROM boards WHERE id = ?'),

  // ============================================
  // Comments operations
  // ============================================
  
  createComment: db.prepare(`
    INSERT INTO comments (id, task_id, author, content)
    VALUES (?, ?, ?, ?)
  `),

  getCommentsByTask: db.prepare(`
    SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC
  `),

  getComment: db.prepare('SELECT * FROM comments WHERE id = ?'),

  updateComment: db.prepare(`
    UPDATE comments SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `),

  deleteComment: db.prepare('DELETE FROM comments WHERE id = ?'),

  deleteCommentsByTask: db.prepare('DELETE FROM comments WHERE task_id = ?'),

  // ============================================
  // Labels operations
  // ============================================
  
  createLabel: db.prepare(`
    INSERT INTO labels (id, name, color, description) VALUES (?, ?, ?, ?)
  `),

  getAllLabels: db.prepare('SELECT * FROM labels ORDER BY name'),

  getLabel: db.prepare('SELECT * FROM labels WHERE id = ?'),

  getLabelByName: db.prepare('SELECT * FROM labels WHERE name = ?'),

  updateLabel: db.prepare(`
    UPDATE labels SET name = ?, color = ?, description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  deleteLabel: db.prepare('DELETE FROM labels WHERE id = ?'),

  // Task-Label relationship operations
  addTaskLabel: db.prepare(`
    INSERT OR IGNORE INTO task_labels (task_id, label_id) VALUES (?, ?)
  `),

  removeTaskLabel: db.prepare(`
    DELETE FROM task_labels WHERE task_id = ? AND label_id = ?
  `),

  getTaskLabels: db.prepare(`
    SELECT l.* FROM labels l
    INNER JOIN task_labels tl ON l.id = tl.label_id
    WHERE tl.task_id = ?
    ORDER BY l.name
  `),

  getTasksByLabel: db.prepare(`
    SELECT t.* FROM tasks t
    INNER JOIN task_labels tl ON t.id = tl.task_id
    WHERE tl.label_id = ?
    ORDER BY t.created_at DESC
  `),

  // ============================================
  // Webhook Events operations
  // ============================================
  
  createWebhookEvent: db.prepare(`
    INSERT INTO webhook_events (id, type, source, payload, task_id)
    VALUES (?, ?, ?, ?, ?)
  `),

  getAllWebhookEvents: db.prepare(`
    SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 100
  `),

  getWebhookEvent: db.prepare('SELECT * FROM webhook_events WHERE id = ?'),

  getUnprocessedWebhookEvents: db.prepare(`
    SELECT * FROM webhook_events WHERE processed = 0 ORDER BY created_at ASC
  `),

  markWebhookEventProcessed: db.prepare(`
    UPDATE webhook_events 
    SET processed = 1, processed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  markWebhookEventError: db.prepare(`
    UPDATE webhook_events 
    SET processed = 1, processed_at = CURRENT_TIMESTAMP, error = ?
    WHERE id = ?
  `),

  deleteWebhookEvent: db.prepare('DELETE FROM webhook_events WHERE id = ?'),

  // ============================================
  // Automation Rules operations
  // ============================================
  
  createAutomationRule: db.prepare(`
    INSERT INTO automation_rules (id, name, enabled, trigger_type, trigger_config, action_type, action_config, priority, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getAllAutomationRules: db.prepare(`
    SELECT * FROM automation_rules ORDER BY priority DESC, name
  `),

  getAutomationRule: db.prepare('SELECT * FROM automation_rules WHERE id = ?'),

  getEnabledAutomationRules: db.prepare(`
    SELECT * FROM automation_rules WHERE enabled = 1 ORDER BY priority DESC
  `),

  getAutomationRulesByTrigger: db.prepare(`
    SELECT * FROM automation_rules 
    WHERE enabled = 1 AND trigger_type = ?
    ORDER BY priority DESC
  `),

  updateAutomationRule: db.prepare(`
    UPDATE automation_rules
    SET name = ?, enabled = ?, trigger_type = ?, trigger_config = ?, 
        action_type = ?, action_config = ?, priority = ?, description = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  toggleAutomationRule: db.prepare(`
    UPDATE automation_rules
    SET enabled = NOT enabled, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  incrementAutomationRuleTriggerCount: db.prepare(`
    UPDATE automation_rules
    SET trigger_count = trigger_count + 1, last_triggered_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  deleteAutomationRule: db.prepare('DELETE FROM automation_rules WHERE id = ?'),

  // ============================================
  // Integration Configs operations
  // ============================================
  
  createOrUpdateIntegrationConfig: db.prepare(`
    INSERT INTO integration_configs (integration_type, config, is_active)
    VALUES (?, ?, ?)
    ON CONFLICT(integration_type) DO UPDATE SET
      config = excluded.config,
      is_active = excluded.is_active,
      updated_at = CURRENT_TIMESTAMP
  `),

  getIntegrationConfig: db.prepare(`
    SELECT * FROM integration_configs WHERE integration_type = ?
  `),

  getAllIntegrationConfigs: db.prepare(`
    SELECT * FROM integration_configs ORDER BY integration_type
  `),

  getActiveIntegrationConfigs: db.prepare(`
    SELECT * FROM integration_configs WHERE is_active = 1
  `),

  updateIntegrationSync: db.prepare(`
    UPDATE integration_configs
    SET last_sync_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE integration_type = ?
  `),

  deleteIntegrationConfig: db.prepare(`
    DELETE FROM integration_configs WHERE integration_type = ?
  `),

  // ============================================
  // Token Usage operations
  // ============================================
  
  createTokenUsage: db.prepare(`
    INSERT INTO token_usage (task_id, phase, provider, model, input_tokens, output_tokens, total_tokens, cost_usd, num_turns, execution_time_ms, refinement_round)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getTokenUsageByTask: db.prepare(`
    SELECT * FROM token_usage WHERE task_id = ? ORDER BY created_at ASC
  `),

  getTokenUsageSummaryByTask: db.prepare(`
    SELECT 
      phase,
      provider,
      SUM(input_tokens) as total_input_tokens,
      SUM(output_tokens) as total_output_tokens,
      SUM(total_tokens) as total_tokens,
      SUM(cost_usd) as total_cost,
      SUM(num_turns) as total_turns,
      COUNT(*) as call_count
    FROM token_usage 
    WHERE task_id = ?
    GROUP BY phase, provider
    ORDER BY phase, provider
  `),

  getAllTokenUsageSummary: db.prepare(`
    SELECT 
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
    LEFT JOIN token_usage tu ON t.id = tu.task_id
    WHERE tu.id IS NOT NULL
    GROUP BY t.id, tu.phase, tu.provider
    ORDER BY t.id DESC, tu.phase, tu.provider
  `),

  getTotalTokenUsage: db.prepare(`
    SELECT 
      provider,
      SUM(input_tokens) as total_input_tokens,
      SUM(output_tokens) as total_output_tokens,
      SUM(total_tokens) as total_tokens,
      SUM(cost_usd) as total_cost,
      COUNT(DISTINCT task_id) as task_count,
      COUNT(*) as call_count
    FROM token_usage
    GROUP BY provider
  `),

  getTokenUsageByDateRange: db.prepare(`
    SELECT
      DATE(created_at) as date,
      phase,
      provider,
      SUM(input_tokens) as total_input_tokens,
      SUM(output_tokens) as total_output_tokens,
      SUM(total_tokens) as total_tokens,
      SUM(cost_usd) as total_cost
    FROM token_usage
    WHERE created_at >= datetime('now', '-' || ? || ' days')
    GROUP BY DATE(created_at), phase, provider
    ORDER BY date DESC, phase, provider
  `),

  // ============================================
  // TDD Tasks operations
  // ============================================

  createTddTask: db.prepare(`
    INSERT INTO tdd_tasks (task_id, tdd_status, current_phase)
    VALUES (?, ?, ?)
  `),

  getTddTask: db.prepare('SELECT * FROM tdd_tasks WHERE id = ?'),

  getTddTaskByTaskId: db.prepare('SELECT * FROM tdd_tasks WHERE task_id = ?'),

  getAllTddTasks: db.prepare('SELECT * FROM tdd_tasks ORDER BY created_at DESC'),

  getTddTasksByStatus: db.prepare('SELECT * FROM tdd_tasks WHERE tdd_status = ? ORDER BY created_at ASC'),

  updateTddTaskStatus: db.prepare(`
    UPDATE tdd_tasks
    SET tdd_status = ?, current_phase = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  updateTddTaskSpecification: db.prepare(`
    UPDATE tdd_tasks
    SET specification = ?, acceptance_criteria = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  updateTddTaskTestCode: db.prepare(`
    UPDATE tdd_tasks
    SET test_code = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  updateTddTaskImplementation: db.prepare(`
    UPDATE tdd_tasks
    SET implementation_code = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  updateTddTaskTestResults: db.prepare(`
    UPDATE tdd_tasks
    SET test_results = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  incrementTddCycleCount: db.prepare(`
    UPDATE tdd_tasks
    SET tdd_cycle_count = tdd_cycle_count + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  deleteTddTask: db.prepare('DELETE FROM tdd_tasks WHERE id = ?'),

  // TDD tasks with pending clarifications
  getTddTasksAwaitingClarification: db.prepare(`
    SELECT t.* FROM tdd_tasks t
    WHERE t.tdd_status = 'awaiting_clarification'
    ORDER BY t.created_at ASC
  `),

  // TDD tasks with all clarifications answered
  getTddTasksWithAnsweredClarifications: db.prepare(`
    SELECT DISTINCT t.* FROM tdd_tasks t
    WHERE t.tdd_status = 'awaiting_clarification'
    AND NOT EXISTS (
      SELECT 1 FROM tdd_clarifications c
      WHERE c.tdd_task_id = t.id AND c.answered_at IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM tdd_clarifications c WHERE c.tdd_task_id = t.id
    )
  `),

  // ============================================
  // TDD Agent State operations
  // ============================================

  createTddAgentState: db.prepare(`
    INSERT INTO tdd_agent_state (tdd_task_id, state_file_path, checkpoint_name, agent_context)
    VALUES (?, ?, ?, ?)
  `),

  getTddAgentState: db.prepare('SELECT * FROM tdd_agent_state WHERE id = ?'),

  getActiveTddAgentState: db.prepare(`
    SELECT * FROM tdd_agent_state
    WHERE tdd_task_id = ? AND is_active = 1
    ORDER BY paused_at DESC LIMIT 1
  `),

  getTddAgentStateHistory: db.prepare(`
    SELECT * FROM tdd_agent_state WHERE tdd_task_id = ? ORDER BY paused_at DESC
  `),

  updateTddAgentStateResumed: db.prepare(`
    UPDATE tdd_agent_state
    SET resumed_at = CURRENT_TIMESTAMP, is_active = 0
    WHERE id = ?
  `),

  deactivateAllTddAgentStates: db.prepare(`
    UPDATE tdd_agent_state
    SET is_active = 0
    WHERE tdd_task_id = ?
  `),

  // ============================================
  // TDD Clarifications operations
  // ============================================

  createTddClarification: db.prepare(`
    INSERT INTO tdd_clarifications (tdd_task_id, question_text, question_type, suggested_options, required, order_index, agent_state_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),

  getTddClarifications: db.prepare(`
    SELECT * FROM tdd_clarifications WHERE tdd_task_id = ? ORDER BY order_index ASC
  `),

  getTddClarification: db.prepare('SELECT * FROM tdd_clarifications WHERE id = ?'),

  getUnansweredTddClarifications: db.prepare(`
    SELECT * FROM tdd_clarifications
    WHERE tdd_task_id = ? AND answered_at IS NULL
    ORDER BY order_index ASC
  `),

  answerTddClarification: db.prepare(`
    UPDATE tdd_clarifications
    SET user_answer = ?, answer_type = ?, answered_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  deleteTddClarifications: db.prepare('DELETE FROM tdd_clarifications WHERE tdd_task_id = ?'),

  // ============================================
  // External Skills operations
  // ============================================

  createExternalSkill: db.prepare(`
    INSERT INTO external_skills (skill_name, skill_path, description, activation_triggers, skill_content, version, is_core, has_checklist, has_diagrams, has_examples)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  upsertExternalSkill: db.prepare(`
    INSERT INTO external_skills (skill_name, skill_path, description, activation_triggers, skill_content, version, is_core, has_checklist, has_diagrams, has_examples, last_synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(skill_name) DO UPDATE SET
      skill_path = excluded.skill_path,
      description = excluded.description,
      activation_triggers = excluded.activation_triggers,
      skill_content = excluded.skill_content,
      version = excluded.version,
      is_core = excluded.is_core,
      has_checklist = excluded.has_checklist,
      has_diagrams = excluded.has_diagrams,
      has_examples = excluded.has_examples,
      last_synced_at = CURRENT_TIMESTAMP
  `),

  getExternalSkill: db.prepare('SELECT * FROM external_skills WHERE id = ?'),

  getExternalSkillByName: db.prepare('SELECT * FROM external_skills WHERE skill_name = ?'),

  getAllExternalSkills: db.prepare('SELECT * FROM external_skills ORDER BY skill_name'),

  getActiveExternalSkills: db.prepare('SELECT * FROM external_skills WHERE is_active = 1 ORDER BY skill_name'),

  getCoreExternalSkills: db.prepare('SELECT * FROM external_skills WHERE is_core = 1 AND is_active = 1 ORDER BY skill_name'),

  toggleExternalSkillActive: db.prepare(`
    UPDATE external_skills
    SET is_active = NOT is_active
    WHERE id = ?
  `),

  deleteAllExternalSkills: db.prepare('DELETE FROM external_skills'),

  // ============================================
  // TDD Execution Logs operations
  // ============================================

  createTddExecutionLog: db.prepare(`
    INSERT INTO tdd_execution_logs (tdd_task_id, phase, skill_used, input_context, started_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `),

  completeTddExecutionLog: db.prepare(`
    UPDATE tdd_execution_logs
    SET output_result = ?, test_output = ?, completed_at = CURRENT_TIMESTAMP,
        elapsed_seconds = ?, success = ?, error = ?
    WHERE id = ?
  `),

  getTddExecutionLogs: db.prepare(`
    SELECT * FROM tdd_execution_logs WHERE tdd_task_id = ? ORDER BY started_at ASC
  `),

  getTddExecutionLogsByPhase: db.prepare(`
    SELECT * FROM tdd_execution_logs WHERE tdd_task_id = ? AND phase = ? ORDER BY started_at ASC
  `),

  // ============================================
  // TDD Test Results operations
  // ============================================

  createTddTestResult: db.prepare(`
    INSERT INTO tdd_test_results (tdd_task_id, cycle_number, phase, test_command, exit_code, stdout, stderr, passed, failed, skipped, duration_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getTddTestResults: db.prepare(`
    SELECT * FROM tdd_test_results WHERE tdd_task_id = ? ORDER BY created_at ASC
  `),

  getTddTestResultsByCycle: db.prepare(`
    SELECT * FROM tdd_test_results WHERE tdd_task_id = ? AND cycle_number = ? ORDER BY created_at ASC
  `),

  getLatestTddTestResult: db.prepare(`
    SELECT * FROM tdd_test_results WHERE tdd_task_id = ? ORDER BY created_at DESC LIMIT 1
  `),

  // ============================================
  // Agentic Workflow - Project Groups
  // ============================================

  createProjectGroup: db.prepare(`
    INSERT INTO project_groups (name, description, is_default)
    VALUES (?, ?, ?)
  `),

  getProjectGroup: db.prepare('SELECT * FROM project_groups WHERE id = ?'),

  getProjectGroupByName: db.prepare('SELECT * FROM project_groups WHERE name = ?'),

  getAllProjectGroups: db.prepare('SELECT * FROM project_groups ORDER BY name'),

  getDefaultProjectGroup: db.prepare('SELECT * FROM project_groups WHERE is_default = 1 LIMIT 1'),

  updateProjectGroup: db.prepare(`
    UPDATE project_groups
    SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  clearDefaultProjectGroup: db.prepare(`
    UPDATE project_groups SET is_default = 0
  `),

  setDefaultProjectGroup: db.prepare(`
    UPDATE project_groups SET is_default = 1 WHERE id = ?
  `),

  deleteProjectGroup: db.prepare('DELETE FROM project_groups WHERE id = ?'),

  // Project Group Members
  addProjectToGroup: db.prepare(`
    INSERT INTO project_group_members (group_id, project_id, is_primary)
    VALUES (?, ?, ?)
  `),

  removeProjectFromGroup: db.prepare(`
    DELETE FROM project_group_members WHERE group_id = ? AND project_id = ?
  `),

  getProjectGroupMembers: db.prepare(`
    SELECT pgm.*, p.name as project_name, p.local_path, p.git_remote_url, p.git_branch
    FROM project_group_members pgm
    JOIN projects p ON pgm.project_id = p.id
    WHERE pgm.group_id = ?
    ORDER BY pgm.is_primary DESC, p.name
  `),

  clearPrimaryProject: db.prepare(`
    UPDATE project_group_members SET is_primary = 0 WHERE group_id = ?
  `),

  setPrimaryProject: db.prepare(`
    UPDATE project_group_members SET is_primary = 1 WHERE group_id = ? AND project_id = ?
  `),

  // ============================================
  // Agentic Workflow - Global Documents
  // ============================================

  createGlobalDocument: db.prepare(`
    INSERT INTO global_documents (filename, original_filename, file_path, file_size, mime_type, description, category, tags, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getGlobalDocument: db.prepare('SELECT * FROM global_documents WHERE id = ?'),

  getAllGlobalDocuments: db.prepare('SELECT * FROM global_documents ORDER BY created_at DESC'),

  getGlobalDocumentsByCategory: db.prepare('SELECT * FROM global_documents WHERE category = ? ORDER BY created_at DESC'),

  updateGlobalDocument: db.prepare(`
    UPDATE global_documents
    SET description = ?, category = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  deleteGlobalDocument: db.prepare('DELETE FROM global_documents WHERE id = ?'),

  // ============================================
  // Agentic Workflow - Tasks
  // ============================================

  createAgenticTask: db.prepare(`
    INSERT INTO agentic_tasks (
      title, description, status, phase, priority, project_group_id,
      auto_advance, error_handling, execution_strategy, code_review_point,
      mcp_servers_config, verification_commands, reference_task_ids
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getAgenticTask: db.prepare('SELECT * FROM agentic_tasks WHERE id = ?'),

  getAllAgenticTasks: db.prepare('SELECT * FROM agentic_tasks ORDER BY created_at DESC'),

  getAgenticTasksByStatus: db.prepare('SELECT * FROM agentic_tasks WHERE status = ? ORDER BY created_at ASC'),

  getAgenticTasksByPhase: db.prepare('SELECT * FROM agentic_tasks WHERE phase = ? ORDER BY created_at ASC'),

  getAgenticTasksByProjectGroup: db.prepare('SELECT * FROM agentic_tasks WHERE project_group_id = ? ORDER BY created_at DESC'),

  updateAgenticTaskStatus: db.prepare(`
    UPDATE agentic_tasks
    SET status = ?, phase = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  updateAgenticTaskPhase: db.prepare(`
    UPDATE agentic_tasks
    SET phase = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  updateAgenticTaskTokens: db.prepare(`
    UPDATE agentic_tasks
    SET total_input_tokens = total_input_tokens + ?,
        total_output_tokens = total_output_tokens + ?,
        total_cost_usd = total_cost_usd + ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  updateAgenticTaskBrainstormingContext: db.prepare(`
    UPDATE agentic_tasks
    SET brainstorming_context = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  deleteAgenticTask: db.prepare('DELETE FROM agentic_tasks WHERE id = ?'),

  // Task Documents
  addAgenticTaskDocument: db.prepare(`
    INSERT INTO agentic_task_documents (task_id, document_type, document_id)
    VALUES (?, ?, ?)
  `),

  getAgenticTaskDocuments: db.prepare(`
    SELECT * FROM agentic_task_documents WHERE task_id = ?
  `),

  removeAgenticTaskDocument: db.prepare(`
    DELETE FROM agentic_task_documents WHERE id = ?
  `),

  // Task Uploads
  createAgenticTaskUpload: db.prepare(`
    INSERT INTO agentic_task_uploads (task_id, filename, original_filename, file_path, file_size, mime_type, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),

  getAgenticTaskUploads: db.prepare('SELECT * FROM agentic_task_uploads WHERE task_id = ?'),

  deleteAgenticTaskUpload: db.prepare('DELETE FROM agentic_task_uploads WHERE id = ?'),

  // ============================================
  // Agentic Workflow - Clarifications
  // ============================================

  createAgenticClarification: db.prepare(`
    INSERT INTO agentic_clarifications (task_id, question_text, question_type, suggested_options, required, order_index)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  getAgenticClarifications: db.prepare(`
    SELECT * FROM agentic_clarifications WHERE task_id = ? ORDER BY order_index ASC
  `),

  getAgenticClarification: db.prepare('SELECT * FROM agentic_clarifications WHERE id = ?'),

  getUnansweredAgenticClarifications: db.prepare(`
    SELECT * FROM agentic_clarifications
    WHERE task_id = ? AND answered_at IS NULL
    ORDER BY order_index ASC
  `),

  answerAgenticClarification: db.prepare(`
    UPDATE agentic_clarifications
    SET user_answer = ?, answer_type = ?, answered_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  deleteAgenticClarifications: db.prepare('DELETE FROM agentic_clarifications WHERE task_id = ?'),

  // ============================================
  // Agentic Workflow - Plans
  // ============================================

  createAgenticPlan: db.prepare(`
    INSERT INTO agentic_plans (task_id, goal, architecture, tech_stack, plan_content, plan_steps)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  getAgenticPlan: db.prepare('SELECT * FROM agentic_plans WHERE task_id = ?'),

  getAgenticPlanById: db.prepare('SELECT * FROM agentic_plans WHERE id = ?'),

  updateAgenticPlan: db.prepare(`
    UPDATE agentic_plans
    SET goal = ?, architecture = ?, tech_stack = ?, plan_content = ?, plan_steps = ?,
        user_modified = 1, version = version + 1, updated_at = CURRENT_TIMESTAMP
    WHERE task_id = ?
  `),

  approveAgenticPlan: db.prepare(`
    UPDATE agentic_plans
    SET approved = 1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE task_id = ?
  `),

  deleteAgenticPlan: db.prepare('DELETE FROM agentic_plans WHERE task_id = ?'),

  // Plan Steps
  createAgenticPlanStep: db.prepare(`
    INSERT INTO agentic_plan_steps (plan_id, step_index, step_title, step_description, estimated_complexity, file_paths, step_content)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),

  getAgenticPlanSteps: db.prepare('SELECT * FROM agentic_plan_steps WHERE plan_id = ? ORDER BY step_index'),

  updateAgenticPlanStepStatus: db.prepare(`
    UPDATE agentic_plan_steps
    SET status = ?, started_at = CASE WHEN ? = 'in_progress' THEN CURRENT_TIMESTAMP ELSE started_at END,
        completed_at = CASE WHEN ? IN ('completed', 'failed', 'skipped') THEN CURRENT_TIMESTAMP ELSE completed_at END
    WHERE id = ?
  `),

  updateAgenticPlanStepOutput: db.prepare(`
    UPDATE agentic_plan_steps SET output = ?, error = ? WHERE id = ?
  `),

  updateAgenticPlanStepReview: db.prepare(`
    UPDATE agentic_plan_steps SET review_status = ?, review_notes = ? WHERE id = ?
  `),

  deleteAgenticPlanSteps: db.prepare('DELETE FROM agentic_plan_steps WHERE plan_id = ?'),

  // ============================================
  // Agentic Workflow - Git Worktrees
  // ============================================

  createAgenticWorktree: db.prepare(`
    INSERT INTO agentic_worktrees (task_id, project_id, worktree_path, branch_name, base_branch)
    VALUES (?, ?, ?, ?, ?)
  `),

  getAgenticWorktree: db.prepare('SELECT * FROM agentic_worktrees WHERE id = ?'),

  getAgenticWorktreesByTask: db.prepare('SELECT * FROM agentic_worktrees WHERE task_id = ?'),

  getAgenticWorktreeByTaskAndProject: db.prepare('SELECT * FROM agentic_worktrees WHERE task_id = ? AND project_id = ?'),

  updateAgenticWorktreeStatus: db.prepare(`
    UPDATE agentic_worktrees
    SET status = ?, merged_at = CASE WHEN ? = 'merged' THEN CURRENT_TIMESTAMP ELSE merged_at END,
        deleted_at = CASE WHEN ? = 'deleted' THEN CURRENT_TIMESTAMP ELSE deleted_at END
    WHERE id = ?
  `),

  deleteAgenticWorktree: db.prepare('DELETE FROM agentic_worktrees WHERE id = ?'),

  // ============================================
  // Agentic Workflow - Pull Requests
  // ============================================

  createAgenticPR: db.prepare(`
    INSERT INTO agentic_pull_requests (task_id, pr_group_id, project_id, worktree_id, pr_title, pr_body)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  getAgenticPR: db.prepare('SELECT * FROM agentic_pull_requests WHERE id = ?'),

  getAgenticPRsByTask: db.prepare('SELECT * FROM agentic_pull_requests WHERE task_id = ?'),

  getAgenticPRsByGroup: db.prepare('SELECT * FROM agentic_pull_requests WHERE pr_group_id = ?'),

  updateAgenticPRStatus: db.prepare(`
    UPDATE agentic_pull_requests
    SET pr_status = ?, pr_number = ?, pr_url = ?,
        merged_at = CASE WHEN ? = 'merged' THEN CURRENT_TIMESTAMP ELSE merged_at END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  updateAgenticPRRollback: db.prepare(`
    UPDATE agentic_pull_requests
    SET pr_status = 'rolled_back', rollback_branch = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  // ============================================
  // Agentic Workflow - Verifications
  // ============================================

  createAgenticVerification: db.prepare(`
    INSERT INTO agentic_verifications (task_id, check_name, check_command, project_id)
    VALUES (?, ?, ?, ?)
  `),

  getAgenticVerifications: db.prepare('SELECT * FROM agentic_verifications WHERE task_id = ?'),

  updateAgenticVerificationStatus: db.prepare(`
    UPDATE agentic_verifications
    SET status = ?, exit_code = ?, stdout = ?, stderr = ?, duration_ms = ?,
        executed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  deleteAgenticVerifications: db.prepare('DELETE FROM agentic_verifications WHERE task_id = ?'),

  // ============================================
  // Agentic Workflow - Execution Logs
  // ============================================

  createAgenticLog: db.prepare(`
    INSERT INTO agentic_execution_logs (task_id, phase, step_id, log_type, message, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  getAgenticLogs: db.prepare(`
    SELECT * FROM agentic_execution_logs WHERE task_id = ? ORDER BY created_at ASC
  `),

  getAgenticLogsByPhase: db.prepare(`
    SELECT * FROM agentic_execution_logs WHERE task_id = ? AND phase = ? ORDER BY created_at ASC
  `),

  getRecentAgenticLogs: db.prepare(`
    SELECT * FROM agentic_execution_logs WHERE task_id = ? ORDER BY created_at DESC LIMIT ?
  `),

  deleteAgenticLogs: db.prepare('DELETE FROM agentic_execution_logs WHERE task_id = ?'),

  // ============================================
  // Agentic Workflow - Task History
  // ============================================

  createAgenticTaskHistory: db.prepare(`
    INSERT INTO agentic_task_history (task_id, archived_data, context_summary, final_status, pr_group_info, rollback_info)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  getAgenticTaskHistory: db.prepare('SELECT * FROM agentic_task_history WHERE task_id = ?'),

  getAllAgenticTaskHistory: db.prepare('SELECT * FROM agentic_task_history ORDER BY archived_at DESC'),

  // ============================================
  // Agentic Workflow - Slack Notifications
  // ============================================

  createSlackConfig: db.prepare(`
    INSERT INTO slack_notification_config (project_group_id, webhook_url, notify_phase_changes, notify_user_action, notify_completion, notify_errors, include_token_usage)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),

  getSlackConfig: db.prepare('SELECT * FROM slack_notification_config WHERE id = ?'),

  getSlackConfigByGroup: db.prepare('SELECT * FROM slack_notification_config WHERE project_group_id = ?'),

  getAllSlackConfigs: db.prepare('SELECT * FROM slack_notification_config ORDER BY created_at DESC'),

  getActiveSlackConfigs: db.prepare('SELECT * FROM slack_notification_config WHERE is_active = 1'),

  updateSlackConfig: db.prepare(`
    UPDATE slack_notification_config
    SET webhook_url = ?, notify_phase_changes = ?, notify_user_action = ?, notify_completion = ?,
        notify_errors = ?, include_token_usage = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  deleteSlackConfig: db.prepare('DELETE FROM slack_notification_config WHERE id = ?'),

  // ============================================
  // Agentic Workflow - Board Visibility
  // ============================================

  upsertBoardVisibility: db.prepare(`
    INSERT INTO board_visibility (board_name, is_visible, display_order)
    VALUES (?, ?, ?)
    ON CONFLICT(board_name) DO UPDATE SET
      is_visible = excluded.is_visible,
      display_order = excluded.display_order,
      updated_at = CURRENT_TIMESTAMP
  `),

  getBoardVisibility: db.prepare('SELECT * FROM board_visibility WHERE board_name = ?'),

  getAllBoardVisibility: db.prepare('SELECT * FROM board_visibility ORDER BY display_order'),

  getVisibleBoards: db.prepare('SELECT * FROM board_visibility WHERE is_visible = 1 ORDER BY display_order'),

  updateBoardVisibility: db.prepare(`
    UPDATE board_visibility SET is_visible = ?, updated_at = CURRENT_TIMESTAMP WHERE board_name = ?
  `),
};

// ============================================
// Sync superpowers skills on database init
// ============================================
function syncSuperpowersSkills() {
  if (isInBuildPhase() || !db) return;

  const CORE_SKILLS = [
    'test-driven-development',
    'brainstorming',
    'writing-plans',
    'verification-before-completion',
    'systematic-debugging',
    'receiving-code-review'
  ];

  // Check if skills already synced
  const existingSkills = statements.getAllExternalSkills.all() as any[];
  const hasTddSkill = existingSkills.some(s => s.skill_name === 'test-driven-development');

  if (hasTddSkill) {
    console.log(`[TDD] Skills already loaded (${existingSkills.length} skills)`);
    return;
  }

  // Look for superpowers repository in multiple locations
  const possiblePaths = [
    path.join(process.cwd(), 'external-skills', 'superpowers', 'skills'),
    path.join(process.cwd(), '..', 'superpowers', 'skills'),
    '/app/external-skills/superpowers/skills'
  ];

  let skillsPath: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      skillsPath = p;
      break;
    }
  }

  if (!skillsPath) {
    // Try to clone the repository
    const externalSkillsDir = path.join(process.cwd(), 'external-skills');
    const superpowersDir = path.join(externalSkillsDir, 'superpowers');

    if (!fs.existsSync(externalSkillsDir)) {
      fs.mkdirSync(externalSkillsDir, { recursive: true });
    }

    if (!fs.existsSync(superpowersDir)) {
      console.log('[TDD] Cloning superpowers repository...');
      try {
        const { execSync } = require('child_process');
        execSync('git clone --depth 1 https://github.com/obra/superpowers.git ' + superpowersDir, {
          stdio: 'pipe',
          timeout: 60000
        });
        skillsPath = path.join(superpowersDir, 'skills');
        console.log('[TDD] Successfully cloned superpowers repository');
      } catch (error: any) {
        console.warn('[TDD] Failed to clone superpowers repository:', error.message);
        return;
      }
    }
  }

  if (!skillsPath || !fs.existsSync(skillsPath)) {
    console.warn('[TDD] Skills directory not found');
    return;
  }

  // Parse and sync skills
  console.log('[TDD] Syncing skills from', skillsPath);
  let syncedCount = 0;
  let coreCount = 0;

  try {
    const skillDirs = fs.readdirSync(skillsPath);

    for (const dir of skillDirs) {
      const skillFilePath = path.join(skillsPath, dir, 'SKILL.md');
      if (!fs.existsSync(skillFilePath)) continue;

      try {
        const content = fs.readFileSync(skillFilePath, 'utf8');

        // Parse frontmatter
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        let name = dir;
        let description = '';

        if (frontmatterMatch) {
          const lines = frontmatterMatch[1].split('\n');
          for (const line of lines) {
            const match = line.match(/^(\w+):\s*(.*)$/);
            if (match) {
              if (match[1] === 'name') name = match[2].trim();
              if (match[1] === 'description') description = match[2].trim();
            }
          }
        }

        const isCore = CORE_SKILLS.includes(name) ? 1 : 0;
        const hasChecklist = content.includes('## Checklist') || content.includes('- [ ]') ? 1 : 0;
        const hasDiagrams = content.includes('```mermaid') || content.includes('digraph') ? 1 : 0;
        const hasExamples = content.includes('<example>') || content.includes('## Example') ? 1 : 0;

        statements.upsertExternalSkill.run(
          name,
          skillFilePath,
          description,
          null,
          content,
          '1.0',
          isCore,
          hasChecklist,
          hasDiagrams,
          hasExamples
        );

        syncedCount++;
        if (isCore) coreCount++;
      } catch (err: any) {
        console.warn(`[TDD] Failed to sync skill ${dir}:`, err.message);
      }
    }

    console.log(`[TDD] Synced ${syncedCount} skills (${coreCount} core)`);
  } catch (error: any) {
    console.error('[TDD] Error syncing skills:', error.message);
  }
}

// Run skills sync on module load
syncSuperpowersSkills();

export default db;
