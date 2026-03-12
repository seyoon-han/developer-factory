export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .trim();
}

export function validateTaskTitle(title: string): { valid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { valid: false, error: 'Title is required' };
  }

  if (title.length > 200) {
    return { valid: false, error: 'Title must be less than 200 characters' };
  }

  return { valid: true };
}

export function validateGitHubUrl(url: string): { valid: boolean; owner?: string; repo?: string; error?: string } {
  const githubRegex = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)/;
  const match = url.match(githubRegex);

  if (!match) {
    return { valid: false, error: 'Invalid GitHub URL format' };
  }

  return {
    valid: true,
    owner: match[1],
    repo: match[2].replace(/\.git$/, ''),
  };
}
