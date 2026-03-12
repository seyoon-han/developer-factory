/**
 * Expert Skills Configuration for Presubmit Evaluations
 * Each expert represents a different senior role that can review implementations
 */

export interface ExpertSkill {
  role: string;
  skillName: string;
  displayName: string;
  icon: string;
  description: string;
  color: string;
}

export const EXPERT_SKILLS: ExpertSkill[] = [
  {
    role: 'architect',
    skillName: 'senior-architect',
    displayName: 'Architect',
    icon: '🏗️',
    description: 'System architecture and design patterns review',
    color: 'blue',
  },
  {
    role: 'backend',
    skillName: 'senior-backend',
    displayName: 'Backend Engineer',
    icon: '⚙️',
    description: 'API design, database, and server-side logic review',
    color: 'green',
  },
  {
    role: 'data',
    skillName: 'senior-data-engineer',
    displayName: 'Data Engineer',
    icon: '📊',
    description: 'Data pipelines, ETL, and data architecture review',
    color: 'purple',
  },
  {
    role: 'devops',
    skillName: 'senior-devops',
    displayName: 'DevOps',
    icon: '🚀',
    description: 'CI/CD, infrastructure, and deployment review',
    color: 'orange',
  },
  {
    role: 'frontend',
    skillName: 'senior-frontend',
    displayName: 'Frontend Engineer',
    icon: '🎨',
    description: 'UI/UX, components, and client-side code review',
    color: 'pink',
  },
  {
    role: 'fullstack',
    skillName: 'senior-fullstack',
    displayName: 'Fullstack Engineer',
    icon: '💻',
    description: 'End-to-end implementation review',
    color: 'indigo',
  },
  {
    role: 'ml',
    skillName: 'senior-ml-engineer',
    displayName: 'ML Engineer',
    icon: '🤖',
    description: 'Machine learning models and data science review',
    color: 'violet',
  },
  {
    role: 'qa',
    skillName: 'senior-qa',
    displayName: 'QA Engineer',
    icon: '✅',
    description: 'Testing strategy, coverage, and quality assurance',
    color: 'teal',
  },
  {
    role: 'secops',
    skillName: 'senior-secops',
    displayName: 'SecOps',
    icon: '🛡️',
    description: 'Security operations and compliance review',
    color: 'red',
  },
  {
    role: 'security',
    skillName: 'senior-security',
    displayName: 'Security',
    icon: '🔒',
    description: 'Security vulnerabilities and best practices review',
    color: 'amber',
  },
];

// Helper to get expert by role
export function getExpertByRole(role: string): ExpertSkill | undefined {
  return EXPERT_SKILLS.find(expert => expert.role === role);
}

// Helper to get color class for expert
export function getExpertColorClass(color: string, variant: 'bg' | 'text' | 'border' = 'bg'): string {
  const colorMap: Record<string, Record<string, string>> = {
    bg: {
      blue: 'bg-blue-100 dark:bg-blue-900',
      green: 'bg-green-100 dark:bg-green-900',
      purple: 'bg-purple-100 dark:bg-purple-900',
      orange: 'bg-orange-100 dark:bg-orange-900',
      pink: 'bg-pink-100 dark:bg-pink-900',
      indigo: 'bg-indigo-100 dark:bg-indigo-900',
      violet: 'bg-violet-100 dark:bg-violet-900',
      teal: 'bg-teal-100 dark:bg-teal-900',
      red: 'bg-red-100 dark:bg-red-900',
      amber: 'bg-amber-100 dark:bg-amber-900',
    },
    text: {
      blue: 'text-blue-700 dark:text-blue-300',
      green: 'text-green-700 dark:text-green-300',
      purple: 'text-purple-700 dark:text-purple-300',
      orange: 'text-orange-700 dark:text-orange-300',
      pink: 'text-pink-700 dark:text-pink-300',
      indigo: 'text-indigo-700 dark:text-indigo-300',
      violet: 'text-violet-700 dark:text-violet-300',
      teal: 'text-teal-700 dark:text-teal-300',
      red: 'text-red-700 dark:text-red-300',
      amber: 'text-amber-700 dark:text-amber-300',
    },
    border: {
      blue: 'border-blue-200 dark:border-blue-800',
      green: 'border-green-200 dark:border-green-800',
      purple: 'border-purple-200 dark:border-purple-800',
      orange: 'border-orange-200 dark:border-orange-800',
      pink: 'border-pink-200 dark:border-pink-800',
      indigo: 'border-indigo-200 dark:border-indigo-800',
      violet: 'border-violet-200 dark:border-violet-800',
      teal: 'border-teal-200 dark:border-teal-800',
      red: 'border-red-200 dark:border-red-800',
      amber: 'border-amber-200 dark:border-amber-800',
    },
  };

  return colorMap[variant][color] || colorMap[variant]['blue'];
}

