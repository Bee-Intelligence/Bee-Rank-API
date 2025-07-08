import { BaseService } from "../../core/base/BaseService";
import type { IBaseService } from "../../interfaces/IBaseService";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: string[];
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailMessage {
  id: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  from: string;
  replyTo?: string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  attachments?: EmailAttachment[];
  templateId?: string;
  templateVariables?: Record<string, any>;
  priority: 'low' | 'normal' | 'high';
  scheduledFor?: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sentAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
  size: number;
  cid?: string; // Content-ID for inline attachments
}

export interface EmailStats {
  totalSent: number;
  totalFailed: number;
  totalPending: number;
  deliveryRate: number;
  bounceRate: number;
  openRate: number;
  clickRate: number;
  recentActivity: {
    sent24h: number;
    failed24h: number;
  };
}

export interface EmailProvider {
  name: string;
  send(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }>;
  getStats?(): Promise<any>;
}

export class EmailService extends BaseService {
  private initialized = false;
  private templates: Map<string, EmailTemplate> = new Map();
  private messages: Map<string, EmailMessage> = new Map();
  private providers: Map<string, EmailProvider> = new Map();
  private defaultProvider = 'smtp';
  private sendQueue: EmailMessage[] = [];
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    super('EmailService');
  }

  async init(): Promise<void> {
    console.log('Initializing EmailService');
    
    try {
      // Initialize email providers
      await this.initializeProviders();
      
      // Load email templates
      await this.loadTemplates();
      
      // Start processing queue
      this.startProcessing();
      
      this.initialized = true;
      console.log('EmailService initialized successfully');
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  private async initializeProviders(): Promise<void> {
    // Mock SMTP provider
    const smtpProvider: EmailProvider = {
      name: 'smtp',
      send: async (message: EmailMessage) => {
        // Simulate email sending
        const success = Math.random() > 0.1; // 90% success rate
        
        if (success) {
          return {
            success: true,
            messageId: `smtp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          };
        } else {
          return {
            success: false,
            error: 'SMTP server error',
          };
        }
      },
    };

    // Mock SendGrid provider
    const sendGridProvider: EmailProvider = {
      name: 'sendgrid',
      send: async (message: EmailMessage) => {
        // Simulate SendGrid API call
        const success = Math.random() > 0.05; // 95% success rate
        
        if (success) {
          return {
            success: true,
            messageId: `sg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          };
        } else {
          return {
            success: false,
            error: 'SendGrid API error',
          };
        }
      },
    };

    this.providers.set('smtp', smtpProvider);
    this.providers.set('sendgrid', sendGridProvider);

    console.log('Email providers initialized');
  }

  private async loadTemplates(): Promise<void> {
    // Mock templates - in real implementation, load from database
    const mockTemplates: EmailTemplate[] = [
      {
        id: 'welcome',
        name: 'Welcome Email',
        subject: 'Welcome to Bee FOMO, {{name}}!',
        htmlContent: `
          <h1>Welcome {{name}}!</h1>
          <p>Thank you for joining Bee FOMO. We're excited to help you navigate the city!</p>
          <p>Get started by:</p>
          <ul>
            <li>Setting up your profile</li>
            <li>Finding nearby taxi ranks</li>
            <li>Planning your first journey</li>
          </ul>
          <p>Happy travels!</p>
        `,
        textContent: 'Welcome {{name}}! Thank you for joining Bee FOMO...',
        variables: ['name'],
        category: 'onboarding',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'journey_reminder',
        name: 'Journey Reminder',
        subject: 'Your journey to {{destination}} starts soon',
        htmlContent: `
          <h2>Journey Reminder</h2>
          <p>Hi {{name}},</p>
          <p>Your journey to <strong>{{destination}}</strong> is scheduled to start at {{time}}.</p>
          <p>Departure location: {{origin}}</p>
          <p>Estimated duration: {{duration}} minutes</p>
          <p>Have a safe trip!</p>
        `,
        variables: ['name', 'destination', 'time', 'origin', 'duration'],
        category: 'journey',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'password_reset',
        name: 'Password Reset',
        subject: 'Reset your Bee FOMO password',
        htmlContent: `
          <h2>Password Reset Request</h2>
          <p>Hi {{name}},</p>
          <p>You requested to reset your password. Click the link below to create a new password:</p>
          <p><a href="{{resetLink}}">Reset Password</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `,
        variables: ['name', 'resetLink'],
        category: 'security',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];

    for (const template of mockTemplates) {
      this.templates.set(template.id, template);
    }

    console.log(`Loaded ${mockTemplates.length} email templates`);
  }

  private startProcessing(): void {
    if (this.processingInterval) {
      return;
    }

    this.processingInterval = setInterval(async () => {
      if (!this.isProcessing && this.sendQueue.length > 0) {
        await this.processQueue();
      }
    }, 5000); // Process every 5 seconds
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.sendQueue.length > 0) {
        const message = this.sendQueue.shift()!;
        await this.sendMessage(message);
      }
    } catch (error) {
      console.error('Error processing email queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  async sendEmail(emailData: {
    to: string | string[];
    subject: string;
    htmlContent?: string;
    textContent?: string;
    from?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: EmailAttachment[];
    priority?: 'low' | 'normal' | 'high';
    scheduledFor?: Date;
    metadata?: Record<string, any>;
  }): Promise<string> {
    try {
      const message: EmailMessage = {
        id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
        cc: emailData.cc,
        bcc: emailData.bcc,
        from: emailData.from || process.env.DEFAULT_FROM_EMAIL || 'noreply@beefomo.com',
        subject: emailData.subject,
        htmlContent: emailData.htmlContent,
        textContent: emailData.textContent,
        attachments: emailData.attachments,
        priority: emailData.priority || 'normal',
        scheduledFor: emailData.scheduledFor,
        status: 'pending',
        metadata: emailData.metadata,
        createdAt: new Date(),
      };

      this.messages.set(message.id, message);

      // Add to queue or send immediately
      if (message.scheduledFor && message.scheduledFor > new Date()) {
        // Schedule for later
        setTimeout(() => {
          this.sendQueue.push(message);
        }, message.scheduledFor.getTime() - Date.now());
      } else {
        // Send immediately
        this.sendQueue.push(message);
      }

      console.log('Email queued for sending', { messageId: message.id, to: message.to });
      return message.id;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async sendFromTemplate(templateId: string, data: {
    to: string | string[];
    variables: Record<string, any>;
    from?: string;
    cc?: string[];
    bcc?: string[];
    priority?: 'low' | 'normal' | 'high';
    scheduledFor?: Date;
    metadata?: Record<string, any>;
  }): Promise<string> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`Email template '${templateId}' not found`);
      }

      if (!template.isActive) {
        throw new Error(`Email template '${templateId}' is not active`);
      }

      // Replace variables in template
      const subject = this.replaceVariables(template.subject, data.variables);
      const htmlContent = template.htmlContent ? this.replaceVariables(template.htmlContent, data.variables) : undefined;
      const textContent = template.textContent ? this.replaceVariables(template.textContent, data.variables) : undefined;

      const message: EmailMessage = {
        id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        to: Array.isArray(data.to) ? data.to : [data.to],
        cc: data.cc,
        bcc: data.bcc,
        from: data.from || process.env.DEFAULT_FROM_EMAIL || 'noreply@beefomo.com',
        subject,
        htmlContent,
        textContent,
        templateId,
        templateVariables: data.variables,
        priority: data.priority || 'normal',
        scheduledFor: data.scheduledFor,
        status: 'pending',
        metadata: data.metadata,
        createdAt: new Date(),
      };

      this.messages.set(message.id, message);

      // Add to queue
      if (message.scheduledFor && message.scheduledFor > new Date()) {
        setTimeout(() => {
          this.sendQueue.push(message);
        }, message.scheduledFor.getTime() - Date.now());
      } else {
        this.sendQueue.push(message);
      }

      console.log('Template email queued for sending', { 
        messageId: message.id, 
        templateId, 
        to: message.to 
      });
      return message.id;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  private replaceVariables(content: string, variables: Record<string, any>): string {
    let result = content;
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    }
    
    return result;
  }

  private async sendMessage(message: EmailMessage): Promise<void> {
    try {
      const provider = this.providers.get(this.defaultProvider);
      if (!provider) {
        throw new Error(`Email provider '${this.defaultProvider}' not found`);
      }

      const result = await provider.send(message);
      
      if (result.success) {
        message.status = 'sent';
        message.sentAt = new Date();
        console.log('Email sent successfully', { 
          messageId: message.id, 
          providerMessageId: result.messageId 
        });
      } else {
        message.status = 'failed';
        message.error = result.error;
        console.error('Email sending failed', { 
          messageId: message.id, 
          error: result.error 
        });
      }
    } catch (error) {
      message.status = 'failed';
      message.error = (error as Error).message;
      console.error('Email sending error', { 
        messageId: message.id, 
        error: (error as Error).message 
      });
    }
  }

  async getMessage(messageId: string): Promise<EmailMessage | null> {
    try {
      return this.messages.get(messageId) || null;
    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }

  async getMessages(filters?: {
    status?: string;
    templateId?: string;
    to?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<EmailMessage[]> {
    try {
      let messages = Array.from(this.messages.values());

      // Apply filters
      if (filters?.status) {
        messages = messages.filter(m => m.status === filters.status);
      }

      if (filters?.templateId) {
        messages = messages.filter(m => m.templateId === filters.templateId);
      }

      if (filters?.to) {
        messages = messages.filter(m => m.to.includes(filters.to!));
      }

      if (filters?.dateFrom) {
        messages = messages.filter(m => m.createdAt >= filters.dateFrom!);
      }

      if (filters?.dateTo) {
        messages = messages.filter(m => m.createdAt <= filters.dateTo!);
      }

      // Sort by creation date (newest first)
      messages.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Apply pagination
      if (filters?.offset) {
        messages = messages.slice(filters.offset);
      }

      if (filters?.limit) {
        messages = messages.slice(0, filters.limit);
      }

      return messages;
    } catch (error) {
      this.handleError(error as Error);
      return [];
    }
  }

  async createTemplate(templateData: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> {
    try {
      const template: EmailTemplate = {
        ...templateData,
        id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.templates.set(template.id, template);

      console.log('Email template created', { templateId: template.id, name: template.name });
      return template;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    try {
      return this.templates.get(templateId) || null;
    } catch (error) {
      this.handleError(error as Error);
      return null;
    }
  }

  async updateTemplate(templateId: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate | null> {
    try {
      const template = this.templates.get(templateId);
      if (!template) {
        return null;
      }

      const updatedTemplate: EmailTemplate = {
        ...template,
        ...updates,
        updatedAt: new Date(),
      };

      this.templates.set(templateId, updatedTemplate);

      console.log('Email template updated', { templateId });
      return updatedTemplate;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const deleted = this.templates.delete(templateId);
      if (deleted) {
        console.log('Email template deleted', { templateId });
      }
      return deleted;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  async getStats(): Promise<EmailStats> {
    try {
      const messages = Array.from(this.messages.values());
      const sent = messages.filter(m => m.status === 'sent');
      const failed = messages.filter(m => m.status === 'failed');
      const pending = messages.filter(m => m.status === 'pending');

      // Recent activity (last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const recent = messages.filter(m => m.createdAt >= oneDayAgo);
      const sent24h = recent.filter(m => m.status === 'sent').length;
      const failed24h = recent.filter(m => m.status === 'failed').length;

      return {
        totalSent: sent.length,
        totalFailed: failed.length,
        totalPending: pending.length,
        deliveryRate: messages.length > 0 ? sent.length / messages.length : 0,
        bounceRate: 0.02, // Mock bounce rate
        openRate: 0.25, // Mock open rate
        clickRate: 0.05, // Mock click rate
        recentActivity: {
          sent24h,
          failed24h,
        },
      };
    } catch (error) {
      this.handleError(error as Error);
      return {
        totalSent: 0,
        totalFailed: 0,
        totalPending: 0,
        deliveryRate: 0,
        bounceRate: 0,
        openRate: 0,
        clickRate: 0,
        recentActivity: {
          sent24h: 0,
          failed24h: 0,
        },
      };
    }
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    const stats = await this.getStats();
    
    return {
      status: 'healthy',
      details: {
        service: 'EmailService',
        initialized: this.initialized,
        queueSize: this.sendQueue.length,
        isProcessing: this.isProcessing,
        templateCount: this.templates.size,
        providerCount: this.providers.size,
        defaultProvider: this.defaultProvider,
        stats,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async shutdown(): Promise<void> {
    console.log('Shutting down EmailService');
    
    // Stop processing
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Process remaining emails
    if (this.sendQueue.length > 0) {
      console.log(`Processing ${this.sendQueue.length} remaining emails`);
      await this.processQueue();
    }

    // Clear data
    this.messages.clear();
    this.templates.clear();
    this.providers.clear();
    this.sendQueue = [];
    
    this.initialized = false;
  }
}