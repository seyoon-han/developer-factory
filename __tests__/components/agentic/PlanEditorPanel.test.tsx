/**
 * Tests for PlanEditorPanel Component
 * Following TDD: Write tests first, watch them fail, then implement
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanEditorPanel } from '@/components/agentic/PlanEditorPanel';
import { AgenticPlan, AgenticPlanStep } from '@/types/agentic-task';

// Mock plan data
const mockPlan: AgenticPlan = {
  id: 1,
  taskId: 1,
  planOverview: 'Implement user authentication feature',
  goal: 'Add secure login/logout functionality',
  architecture: 'REST API with JWT tokens',
  techStack: 'Node.js, Express, JWT',
  planContent: '[]',
  planSteps: [
    {
      id: 1,
      planId: 1,
      order: 0,
      title: 'Setup authentication middleware',
      description: 'Create JWT verification middleware',
      estimatedComplexity: 'medium',
      status: 'pending',
    },
    {
      id: 2,
      planId: 1,
      order: 1,
      title: 'Implement login endpoint',
      description: 'POST /api/auth/login with email and password',
      estimatedComplexity: 'medium',
      status: 'pending',
    },
    {
      id: 3,
      planId: 1,
      order: 2,
      title: 'Implement logout endpoint',
      description: 'POST /api/auth/logout to invalidate token',
      estimatedComplexity: 'low',
      status: 'pending',
    },
  ],
  userModified: false,
  status: 'pending_review',
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Mock callbacks
const mockOnApprove = jest.fn();
const mockOnReject = jest.fn();
const mockOnUpdate = jest.fn();

describe('PlanEditorPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Display', () => {
    test('renders plan overview', () => {
      render(
        <PlanEditorPanel
          plan={mockPlan}
          taskId={1}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText(/Implement user authentication feature/i)).toBeInTheDocument();
    });

    test('renders all plan steps', () => {
      render(
        <PlanEditorPanel
          plan={mockPlan}
          taskId={1}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText(/Setup authentication middleware/i)).toBeInTheDocument();
      expect(screen.getByText(/Implement login endpoint/i)).toBeInTheDocument();
      expect(screen.getByText(/Implement logout endpoint/i)).toBeInTheDocument();
    });

    test('shows step numbers in order', () => {
      render(
        <PlanEditorPanel
          plan={mockPlan}
          taskId={1}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onUpdate={mockOnUpdate}
        />
      );

      // Check that steps are numbered 1, 2, 3
      const stepNumbers = screen.getAllByTestId('step-number');
      expect(stepNumbers[0]).toHaveTextContent('1');
      expect(stepNumbers[1]).toHaveTextContent('2');
      expect(stepNumbers[2]).toHaveTextContent('3');
    });
  });

  describe('Inline Editing', () => {
    test('step title becomes editable when clicked', async () => {
      render(
        <PlanEditorPanel
          plan={mockPlan}
          taskId={1}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onUpdate={mockOnUpdate}
        />
      );

      const editButton = screen.getAllByTestId('edit-step-button')[0];
      fireEvent.click(editButton);

      const titleInput = screen.getByTestId('step-title-input-0');
      expect(titleInput).toBeInTheDocument();
    });

    test('editing step title calls onUpdate with new data', async () => {
      const user = userEvent.setup();
      render(
        <PlanEditorPanel
          plan={mockPlan}
          taskId={1}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onUpdate={mockOnUpdate}
        />
      );

      // Click edit button
      const editButton = screen.getAllByTestId('edit-step-button')[0];
      fireEvent.click(editButton);

      // Edit the title
      const titleInput = screen.getByTestId('step-title-input-0');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated step title');

      // Save the edit
      const saveButton = screen.getByTestId('save-step-button-0');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            planSteps: expect.arrayContaining([
              expect.objectContaining({ title: 'Updated step title' }),
            ]),
          })
        );
      });
    });

    test('can edit step description', async () => {
      const user = userEvent.setup();
      render(
        <PlanEditorPanel
          plan={mockPlan}
          taskId={1}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onUpdate={mockOnUpdate}
        />
      );

      // Click edit button
      const editButton = screen.getAllByTestId('edit-step-button')[0];
      fireEvent.click(editButton);

      // Edit the description
      const descInput = screen.getByTestId('step-desc-input-0');
      await user.clear(descInput);
      await user.type(descInput, 'New description text');

      // Save
      const saveButton = screen.getByTestId('save-step-button-0');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            planSteps: expect.arrayContaining([
              expect.objectContaining({ description: 'New description text' }),
            ]),
          })
        );
      });
    });
  });

  describe('Add/Delete Steps', () => {
    test('can add a new step', async () => {
      const user = userEvent.setup();
      render(
        <PlanEditorPanel
          plan={mockPlan}
          taskId={1}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onUpdate={mockOnUpdate}
        />
      );

      const addButton = screen.getByTestId('add-step-button');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            planSteps: expect.arrayContaining([
              expect.objectContaining({ title: 'New Step' }),
            ]),
          })
        );
      });
    });

    test('can delete a step', async () => {
      render(
        <PlanEditorPanel
          plan={mockPlan}
          taskId={1}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onUpdate={mockOnUpdate}
        />
      );

      // Click delete on first step
      const deleteButtons = screen.getAllByTestId('delete-step-button');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            planSteps: expect.not.arrayContaining([
              expect.objectContaining({ id: 1 }),
            ]),
          })
        );
      });
    });

    test('deleting step reorders remaining steps', async () => {
      render(
        <PlanEditorPanel
          plan={mockPlan}
          taskId={1}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onUpdate={mockOnUpdate}
        />
      );

      // Delete middle step (index 1)
      const deleteButtons = screen.getAllByTestId('delete-step-button');
      fireEvent.click(deleteButtons[1]);

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            planSteps: expect.arrayContaining([
              expect.objectContaining({ order: 0 }),
              expect.objectContaining({ order: 1 }),
            ]),
          })
        );
      });
    });
  });

  describe('Drag and Drop Reordering', () => {
    test('has drag handles on each step', () => {
      render(
        <PlanEditorPanel
          plan={mockPlan}
          taskId={1}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onUpdate={mockOnUpdate}
        />
      );

      const dragHandles = screen.getAllByTestId('drag-handle');
      expect(dragHandles).toHaveLength(3);
    });

    test('reordering steps updates order property', async () => {
      render(
        <PlanEditorPanel
          plan={mockPlan}
          taskId={1}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onUpdate={mockOnUpdate}
        />
      );

      // Simulate moving step 3 to position 1
      const moveUpButtons = screen.getAllByTestId('move-up-button');
      fireEvent.click(moveUpButtons[2]); // Move third step up
      fireEvent.click(moveUpButtons[1]); // Move it up again

      await waitFor(() => {
        expect(mockOnUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('Approve/Reject Actions', () => {
    test('approve button calls onApprove', async () => {
      render(
        <PlanEditorPanel
          plan={mockPlan}
          taskId={1}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onUpdate={mockOnUpdate}
        />
      );

      const approveButton = screen.getByTestId('approve-plan-button');
      fireEvent.click(approveButton);

      expect(mockOnApprove).toHaveBeenCalled();
    });

    test('reject button calls onReject with reason', async () => {
      const user = userEvent.setup();
      
      // Mock window.prompt
      window.prompt = jest.fn().mockReturnValue('Needs more detail');

      render(
        <PlanEditorPanel
          plan={mockPlan}
          taskId={1}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onUpdate={mockOnUpdate}
        />
      );

      const rejectButton = screen.getByTestId('reject-plan-button');
      fireEvent.click(rejectButton);

      expect(mockOnReject).toHaveBeenCalledWith('Needs more detail');
    });
  });

  describe('Edge Cases', () => {
    test('renders empty state when no plan', () => {
      render(
        <PlanEditorPanel
          plan={null}
          taskId={1}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText(/No plan generated yet/i)).toBeInTheDocument();
    });

    test('approve/reject buttons disabled when plan not in review state', () => {
      const approvedPlan = { ...mockPlan, status: 'approved' as const };
      
      render(
        <PlanEditorPanel
          plan={approvedPlan}
          taskId={1}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          onUpdate={mockOnUpdate}
        />
      );

      const approveButton = screen.queryByTestId('approve-plan-button');
      expect(approveButton).not.toBeInTheDocument();
    });
  });
});

