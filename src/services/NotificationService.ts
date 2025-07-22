import { apiService } from './api';
import { User, EvaluationCycle, Evaluation } from '../types';

/**
 * Service for handling notifications related to evaluation cycles and evaluations
 */
export class NotificationService {
  /**
   * Send notifications to all managers when a new evaluation cycle is created
   * @param cycle The newly created evaluation cycle
   */
  static async notifyCycleCreation(cycle: EvaluationCycle): Promise<void> {
    try {
      // Get all managers
      const users = await apiService.getAllUsers();
      const managers = users.filter(user => user.role.name?.toLowerCase() === 'manager');
      
      // Create notification for each manager
      for (const manager of managers) {
        await apiService.createNotification({
          userId: manager.id.toString(),
          type: 'evaluation_window',
          title: 'New Evaluation Cycle Created',
          message: `A new evaluation cycle "${cycle.name}" has been created and will be active from ${new Date(cycle.executionStartDate).toLocaleDateString()} to ${new Date(cycle.executionEndDate).toLocaleDateString()}.`,
          isRead: false
        });
      }
    } catch (error) {
      console.error('Error sending cycle creation notifications:', error);
    }
  }

  /**
   * Send notifications to all managers when an evaluation cycle is activated
   * @param cycle The activated evaluation cycle
   */
  static async notifyCycleActivation(cycle: EvaluationCycle): Promise<void> {
    try {
      // Get all managers
      const users = await apiService.getAllUsers();
      const managers = users.filter(user => user.role.name?.toLowerCase() === 'manager');
      
      // Create notification for each manager
      for (const manager of managers) {
        await apiService.createNotification({
          userId: manager.id.toString(),
          type: 'evaluation_window',
          title: 'Evaluation Cycle Activated',
          message: `The evaluation cycle "${cycle.name}" has been activated. Please complete your team's evaluations by ${new Date(cycle.executionEndDate).toLocaleDateString()}.`,
          isRead: false
        });
      }
    } catch (error) {
      console.error('Error sending cycle activation notifications:', error);
    }
  }

  /**
   * Send a reminder to managers about upcoming evaluation deadlines
   * @param cycle The evaluation cycle
   * @param daysRemaining Number of days remaining until the deadline
   */
  static async sendDeadlineReminders(cycle: EvaluationCycle, daysRemaining: number): Promise<void> {
    try {
      // Get all evaluations for this cycle
      const evaluations = await apiService.getEvaluations({ cycleId: cycle.id });
      
      // Group evaluations by manager
      const evaluationsByManager: Record<string, Evaluation[]> = {};
      for (const evaluation of evaluations) {
        if (evaluation.status !== 'approved' && evaluation.status !== 'submitted') {
          const managerId = evaluation.managerId.toString();
          if (!evaluationsByManager[managerId]) {
            evaluationsByManager[managerId] = [];
          }
          evaluationsByManager[managerId].push(evaluation);
        }
      }
      
      // Send reminders to managers with pending evaluations
      for (const managerId in evaluationsByManager) {
        const pendingCount = evaluationsByManager[managerId].length;
        if (pendingCount > 0) {
          await apiService.createNotification({
            userId: managerId,
            type: 'evaluation_window',
            title: 'Evaluation Deadline Reminder',
            message: `You have ${pendingCount} pending evaluations for the "${cycle.name}" cycle. The deadline is in ${daysRemaining} days (${new Date(cycle.executionEndDate).toLocaleDateString()}).`,
            isRead: false
          });
        }
      }
    } catch (error) {
      console.error('Error sending deadline reminders:', error);
    }
  }

  /**
   * Send a notification to an employee when their evaluation is submitted
   * @param evaluation The submitted evaluation
   */
  static async notifyEvaluationSubmission(evaluation: Evaluation): Promise<void> {
    try {
      await apiService.createNotification({
        userId: evaluation.employeeId.toString(),
        type: 'evaluation_submitted',
        title: 'Evaluation Submitted',
        message: `Your evaluation for the period "${evaluation.period}" has been submitted by your manager.`,
        isRead: false
      });
    } catch (error) {
      console.error('Error sending evaluation submission notification:', error);
    }
  }

  /**
   * Send a notification to an employee when their evaluation is approved
   * @param evaluation The approved evaluation
   */
  static async notifyEvaluationApproval(evaluation: Evaluation): Promise<void> {
    try {
      await apiService.createNotification({
        userId: evaluation.employeeId.toString(),
        type: 'results_available',
        title: 'Evaluation Approved',
        message: `Your evaluation for the period "${evaluation.period}" has been approved. You can now view your results.`,
        isRead: false
      });
    } catch (error) {
      console.error('Error sending evaluation approval notification:', error);
    }
  }
}

export default NotificationService;