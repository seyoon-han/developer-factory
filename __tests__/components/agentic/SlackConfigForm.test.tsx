/**
 * Tests for SlackConfigForm Component
 * Following TDD: Write tests first, watch them fail, then implement
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SlackConfigForm } from '@/components/agentic/SlackConfigForm';

const mockConfig = {
  id: 1,
  projectGroupId: 1,
  webhookUrl: 'https://hooks.slack.com/services/T00/B00/XXXX',
  notifyPhaseChanges: true,
  notifyUserAction: true,
  notifyCompletion: true,
  notifyErrors: true,
  includeTokenUsage: false,
  isActive: true,
};

const mockProjectGroups = [
  { id: 1, name: 'Frontend Projects' },
  { id: 2, name: 'Backend Services' },
  { id: 3, name: 'Mobile Apps' },
];

const mockOnSave = jest.fn();
const mockOnTest = jest.fn();
const mockOnDelete = jest.fn();

describe('SlackConfigForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Display', () => {
    test('renders form', () => {
      render(
        <SlackConfigForm
          config={null}
          projectGroups={mockProjectGroups}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByTestId('slack-config-form')).toBeInTheDocument();
    });

    test('shows project group selector', () => {
      render(
        <SlackConfigForm
          config={null}
          projectGroups={mockProjectGroups}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByLabelText(/project group/i)).toBeInTheDocument();
    });

    test('shows webhook URL input', () => {
      render(
        <SlackConfigForm
          config={null}
          projectGroups={mockProjectGroups}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByLabelText(/webhook url/i)).toBeInTheDocument();
    });

    test('shows notification toggles', () => {
      render(
        <SlackConfigForm
          config={null}
          projectGroups={mockProjectGroups}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByLabelText(/phase changes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/user action/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/completion/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/errors/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/token usage/i)).toBeInTheDocument();
    });

    test('shows active toggle', () => {
      render(
        <SlackConfigForm
          config={null}
          projectGroups={mockProjectGroups}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByLabelText(/active/i)).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    test('populates form with existing config', () => {
      render(
        <SlackConfigForm
          config={mockConfig}
          projectGroups={mockProjectGroups}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onDelete={mockOnDelete}
        />
      );

      const webhookInput = screen.getByLabelText(/webhook url/i);
      expect(webhookInput).toHaveValue(mockConfig.webhookUrl);
    });

    test('shows delete button for existing config', () => {
      render(
        <SlackConfigForm
          config={mockConfig}
          projectGroups={mockProjectGroups}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByTestId('delete-config-button')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    test('save button calls onSave with form data', async () => {
      const user = userEvent.setup();
      
      render(
        <SlackConfigForm
          config={null}
          projectGroups={mockProjectGroups}
          selectedGroupId={1}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onDelete={mockOnDelete}
        />
      );

      // Fill in webhook URL - must match the pattern
      const webhookInput = screen.getByLabelText(/webhook url/i);
      await user.type(webhookInput, 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX');

      // Click save
      const saveButton = screen.getByTestId('save-config-button');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            projectGroupId: 1,
            webhookUrl: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
          })
        );
      });
    });

    test('validates webhook URL format', async () => {
      const user = userEvent.setup();
      
      render(
        <SlackConfigForm
          config={null}
          projectGroups={mockProjectGroups}
          selectedGroupId={1}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onDelete={mockOnDelete}
        />
      );

      // Enter invalid webhook URL
      const webhookInput = screen.getByLabelText(/webhook url/i);
      await user.type(webhookInput, 'invalid-url');

      // Click save
      const saveButton = screen.getByTestId('save-config-button');
      fireEvent.click(saveButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/invalid webhook url/i)).toBeInTheDocument();
      });

      // Should not call onSave
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  describe('Test Webhook', () => {
    test('test button calls onTest with webhook URL', async () => {
      const user = userEvent.setup();
      
      render(
        <SlackConfigForm
          config={mockConfig}
          projectGroups={mockProjectGroups}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onDelete={mockOnDelete}
        />
      );

      const testButton = screen.getByTestId('test-webhook-button');
      fireEvent.click(testButton);

      expect(mockOnTest).toHaveBeenCalledWith(mockConfig.webhookUrl);
    });

    test('test button is disabled when webhook URL is empty', () => {
      render(
        <SlackConfigForm
          config={null}
          projectGroups={mockProjectGroups}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onDelete={mockOnDelete}
        />
      );

      const testButton = screen.getByTestId('test-webhook-button');
      expect(testButton).toBeDisabled();
    });
  });

  describe('Delete Configuration', () => {
    test('delete button calls onDelete', async () => {
      window.confirm = jest.fn().mockReturnValue(true);

      render(
        <SlackConfigForm
          config={mockConfig}
          projectGroups={mockProjectGroups}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByTestId('delete-config-button');
      fireEvent.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith(mockConfig.id);
    });

    test('delete shows confirmation dialog', () => {
      window.confirm = jest.fn().mockReturnValue(false);

      render(
        <SlackConfigForm
          config={mockConfig}
          projectGroups={mockProjectGroups}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onDelete={mockOnDelete}
        />
      );

      const deleteButton = screen.getByTestId('delete-config-button');
      fireEvent.click(deleteButton);

      expect(window.confirm).toHaveBeenCalled();
      expect(mockOnDelete).not.toHaveBeenCalled();
    });
  });

  describe('Notification Toggles', () => {
    test('can toggle phase changes notification', async () => {
      render(
        <SlackConfigForm
          config={mockConfig}
          projectGroups={mockProjectGroups}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onDelete={mockOnDelete}
        />
      );

      const phaseToggle = screen.getByLabelText(/phase changes/i);
      fireEvent.click(phaseToggle);

      const saveButton = screen.getByTestId('save-config-button');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            notifyPhaseChanges: false, // Toggled from true to false
          })
        );
      });
    });

    test('can toggle errors notification', async () => {
      render(
        <SlackConfigForm
          config={mockConfig}
          projectGroups={mockProjectGroups}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onDelete={mockOnDelete}
        />
      );

      const errorsToggle = screen.getByLabelText(/errors/i);
      fireEvent.click(errorsToggle);

      const saveButton = screen.getByTestId('save-config-button');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            notifyErrors: false, // Toggled from true to false
          })
        );
      });
    });
  });

  describe('Loading State', () => {
    test('shows loading state when saving', () => {
      render(
        <SlackConfigForm
          config={mockConfig}
          projectGroups={mockProjectGroups}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onDelete={mockOnDelete}
          isSaving={true}
        />
      );

      expect(screen.getByTestId('save-config-button')).toBeDisabled();
    });

    test('shows loading state when testing', () => {
      render(
        <SlackConfigForm
          config={mockConfig}
          projectGroups={mockProjectGroups}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onDelete={mockOnDelete}
          isTesting={true}
        />
      );

      expect(screen.getByText(/testing/i)).toBeInTheDocument();
    });
  });

  describe('Project Group Selection', () => {
    test('can select a project group', async () => {
      const user = userEvent.setup();
      
      render(
        <SlackConfigForm
          config={null}
          projectGroups={mockProjectGroups}
          onSave={mockOnSave}
          onTest={mockOnTest}
          onDelete={mockOnDelete}
        />
      );

      const groupSelect = screen.getByLabelText(/project group/i);
      await user.selectOptions(groupSelect, '2');

      // Fill webhook to enable save - must match pattern
      const webhookInput = screen.getByLabelText(/webhook url/i);
      await user.type(webhookInput, 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX');

      const saveButton = screen.getByTestId('save-config-button');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            projectGroupId: 2,
          })
        );
      });
    });
  });
});

