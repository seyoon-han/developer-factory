// Database initialization script for Docker
// Runs before Next.js starts to create tables

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'tasks.db');

// Create data directory
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✅ Created data directory');
}

// Create/open database
const db = new Database(dbPath);
console.log('✅ Database connected');

// Enable WAL mode
db.pragma('journal_mode = WAL');

// Create all tables
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    demo_mode INTEGER DEFAULT 0,
    anthropic_api_key TEXT,
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

  CREATE TABLE IF NOT EXISTS team_rulesets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    version TEXT,
    dependencies TEXT DEFAULT '[]',
    body TEXT NOT NULL,
    when_apply TEXT,
    resources TEXT DEFAULT '[]',
    enabled BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (length(name) <= 100 AND length(name) > 0),
    CHECK (description IS NULL OR length(description) <= 500),
    CHECK (body IS NOT NULL AND length(body) > 0)
  );

  -- Add all other tables...
  -- (Copying critical ones for now)
`);

// Insert default app settings
db.exec(`INSERT OR IGNORE INTO app_settings (id, demo_mode) VALUES (1, 0);`);

// Migration: Add github_token column if it doesn't exist
try {
  db.exec(`ALTER TABLE app_settings ADD COLUMN github_token TEXT;`);
  console.log('✅ Migration: Added github_token column');
} catch (error) {
  // Column already exists, that's fine
  console.log('   (github_token column already exists)');
}

// Create TDD-related tables
db.exec(`
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
    agent_state_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK (tdd_status IN ('backlog', 'spec_elicitation', 'awaiting_clarification', 'test_generation', 'implementation_draft', 'code_refinement', 'done')),
    CHECK (current_phase IN ('spec_elicitation', 'awaiting_clarification', 'red_phase', 'green_phase', 'refactor_phase', 'verification', 'complete'))
  );
`);
console.log('✅ TDD tables created');

// Create Agentic Workflow tables
db.exec(`
  -- Project Groups (grouping multiple repos for coordinated work)
  CREATE TABLE IF NOT EXISTS project_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    base_branch TEXT DEFAULT 'main',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Project Group Members (junction table)
  CREATE TABLE IF NOT EXISTS project_group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    project_id INTEGER NOT NULL,
    is_primary INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, project_id)
  );

  -- Agentic Tasks (main task record)
  CREATE TABLE IF NOT EXISTS agentic_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo',
    phase TEXT NOT NULL DEFAULT 'idle',
    priority TEXT NOT NULL DEFAULT 'medium',
    project_group_id INTEGER,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Agentic Task Documents
  CREATE TABLE IF NOT EXISTS agentic_task_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    document_type TEXT NOT NULL,
    document_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Agentic Task Uploads
  CREATE TABLE IF NOT EXISTS agentic_task_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Agentic Clarifications
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Agentic Plans
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Agentic Plan Steps
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
    review_notes TEXT
  );

  -- Agentic Git Worktrees
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
    deleted_at DATETIME
  );

  -- Agentic Pull Requests
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Agentic Verifications
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
    executed_at DATETIME
  );

  -- Agentic Execution Logs
  CREATE TABLE IF NOT EXISTS agentic_execution_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    phase TEXT NOT NULL,
    step_id INTEGER,
    log_type TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Agentic Task History
  CREATE TABLE IF NOT EXISTS agentic_task_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    archived_data TEXT NOT NULL,
    context_summary TEXT,
    final_status TEXT NOT NULL,
    pr_group_info TEXT,
    rollback_info TEXT,
    archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Slack Notification Config
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

  -- Board Visibility
  CREATE TABLE IF NOT EXISTS board_visibility (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_name TEXT NOT NULL UNIQUE,
    is_visible INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Agentic Indexes
  CREATE INDEX IF NOT EXISTS idx_agentic_tasks_status ON agentic_tasks(status);
  CREATE INDEX IF NOT EXISTS idx_agentic_tasks_phase ON agentic_tasks(phase);
  CREATE INDEX IF NOT EXISTS idx_agentic_clarifications_task ON agentic_clarifications(task_id);
  CREATE INDEX IF NOT EXISTS idx_agentic_plans_task ON agentic_plans(task_id);
  CREATE INDEX IF NOT EXISTS idx_agentic_worktrees_task ON agentic_worktrees(task_id);
  CREATE INDEX IF NOT EXISTS idx_agentic_logs_task ON agentic_execution_logs(task_id);
`);
console.log('✅ Agentic Workflow tables created');

// Insert default board visibility
db.exec(`
  INSERT OR IGNORE INTO board_visibility (board_name, is_visible, display_order) VALUES
    ('agentic-workflow-board', 1, 0),
    ('dev-board', 0, 1),
    ('tdd-board', 0, 2);
`);
console.log('✅ Board visibility defaults set');

// Sync superpowers skills from manifest to database
const manifestPath = path.join(process.cwd(), 'external-skills', 'manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const skillsPath = path.join(process.cwd(), 'external-skills', 'superpowers', 'skills');

    const CORE_SKILLS = [
      'test-driven-development',
      'brainstorming',
      'writing-plans',
      'verification-before-completion',
      'systematic-debugging',
      'receiving-code-review'
    ];

    const upsertSkill = db.prepare(`
      INSERT INTO external_skills (skill_name, skill_path, description, skill_content, version, is_core, has_checklist, has_diagrams, has_examples)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(skill_name) DO UPDATE SET
        skill_path = excluded.skill_path,
        description = excluded.description,
        skill_content = excluded.skill_content,
        version = excluded.version,
        is_core = excluded.is_core,
        has_checklist = excluded.has_checklist,
        has_diagrams = excluded.has_diagrams,
        has_examples = excluded.has_examples,
        last_synced_at = CURRENT_TIMESTAMP
    `);

    let syncedCount = 0;
    let coreCount = 0;

    for (const skill of manifest.skills) {
      try {
        // Read full skill content from file
        const skillContent = fs.readFileSync(skill.path, 'utf8');
        const isCore = CORE_SKILLS.includes(skill.name) ? 1 : 0;

        upsertSkill.run(
          skill.name,
          skill.path,
          skill.description || '',
          skillContent,
          manifest.version,
          isCore,
          skill.metadata?.hasChecklist ? 1 : 0,
          skill.metadata?.hasDiagrams ? 1 : 0,
          skill.metadata?.hasExamples ? 1 : 0
        );

        syncedCount++;
        if (isCore) coreCount++;
      } catch (err) {
        console.error(`   Failed to sync skill ${skill.name}:`, err.message);
      }
    }

    console.log(`✅ Synced ${syncedCount} superpowers skills (${coreCount} core)`);
  } catch (error) {
    console.error('⚠️  Failed to sync skills from manifest:', error.message);
  }
} else {
  console.log('   (No skills manifest found - skills will be synced on first TDD board use)');
}

console.log('✅ Database initialized successfully');
db.close();

