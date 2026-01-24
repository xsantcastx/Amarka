import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  user,
  User,
  updateProfile
} from '@angular/fire/auth';
import { 
  Firestore, 
  doc, 
  setDoc, 
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy
} from '@angular/fire/firestore';
import { Observable, from, of, switchMap } from 'rxjs';
import { SettingsService } from './settings.service';
import { EmailService } from './email.service';
import { BrandConfigService } from '../core/services/brand-config.service';
import { LoggerService } from './logger.service';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  company?: string;
  phone?: string;
  role: 'client' | 'admin';
  createdAt: Date;
  updatedAt?: Date;
  disabled?: boolean;
  lastLogin?: Date;
  loginAttempts?: number;
  lastFailedLogin?: Date;
  lockedUntil?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private settingsService = inject(SettingsService);
  private emailService = inject(EmailService);
  private brandConfig = inject(BrandConfigService);
  private router = inject(Router);
  private logger = inject(LoggerService);
  
  // Observable of current user
  user$ = user(this.auth);
  
  // Observable of current user profile
  userProfile$: Observable<UserProfile | null> = this.user$.pipe(
    switchMap(user => {
      if (!user) return of(null);
      return from(this.getUserProfile(user.uid));
    })
  );

  constructor() {
    // Note: Firebase persistence is configured during provideAuth in app.config.ts.
    // Leaving constructor empty keeps this service tree-shakable and avoids duplicate init.
  }

  // Register new user
  async register(email: string, password: string, displayName: string, company?: string, phone?: string): Promise<User> {
    // Get security settings
    const settings = await this.settingsService.getSettings();
    
    // Validate email domain if allowedDomains is configured
    if (settings.allowedDomains && settings.allowedDomains.trim()) {
      const emailDomain = email.split('@')[1]?.toLowerCase();
      const allowedDomains = settings.allowedDomains
        .split(',')
        .map(d => d.trim().toLowerCase())
        .filter(d => d.length > 0);
      
      if (allowedDomains.length > 0 && !allowedDomains.includes(emailDomain)) {
        this.logger.warn(`AuthService email domain ${emailDomain} not in allowed list`, allowedDomains);
        throw new Error(`Registration is restricted to the following email domains: ${settings.allowedDomains}`);
      }
      
      this.logger.debug(`AuthService email domain ${emailDomain} is allowed`);
    }
    
    // Validate password length
    if (password.length < settings.passwordMinLength) {
      throw new Error(`Password must be at least ${settings.passwordMinLength} characters long`);
    }

    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    const user = userCredential.user;

    // Update profile
    await updateProfile(user, { displayName });

    // Create user document in Firestore
    await this.createUserProfile(user.uid, {
      uid: user.uid,
      email: email,
      displayName: displayName,
      company: company,
      phone: phone,
      role: 'client',
      createdAt: new Date(),
      loginAttempts: 0
    });
    
    // Send new user notification email if enabled
    await this.sendNewUserNotification(user.uid, email, displayName);

    return user;
  }

  // Sign in
  async signIn(email: string, password: string): Promise<User> {
    // Get security settings
    const settings = await this.settingsService.getSettings();
    
    try {
      // Check if we can find the user profile by email to check for locks
      const usersCol = collection(this.firestore, 'users');
      const snapshot = await getDocs(usersCol);
      const userDocs = snapshot.docs.filter(doc => doc.data()['email'] === email);
      
      if (userDocs.length > 0) {
        const userData = userDocs[0].data() as UserProfile;
        
        // Check if account is locked
        if (userData.lockedUntil) {
          const lockedUntil = (userData.lockedUntil as any)?.toDate ? (userData.lockedUntil as any).toDate() : userData.lockedUntil;
          if (lockedUntil && new Date() < new Date(lockedUntil)) {
            const minutesLeft = Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 60000);
            throw new Error(`Account locked due to too many failed login attempts. Try again in ${minutesLeft} minute(s).`);
          } else if (lockedUntil && new Date() >= new Date(lockedUntil)) {
            // Lock expired, reset attempts
            await updateDoc(doc(this.firestore, `users/${userData.uid}`), {
              loginAttempts: 0,
              lockedUntil: null,
              updatedAt: new Date()
            });
          }
        }
      }
      
      // Attempt sign in
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      
      // Ensure profile exists (covers cases where creation previously failed)
      const userDoc = doc(this.firestore, `users/${user.uid}`);
      const existingProfile = await getDoc(userDoc);
      if (!existingProfile.exists()) {
        await setDoc(userDoc, {
          uid: user.uid,
          email: user.email || email,
          displayName: user.displayName || '',
          role: 'client',
          createdAt: new Date(),
          loginAttempts: 0,
          updatedAt: new Date()
        });
      }
      
      // Reset login attempts on successful login
      await updateDoc(userDoc, {
        lastLogin: new Date(),
        loginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date()
      });
      
      this.logger.debug('AuthService successful login, reset attempts for', user.email);
      return user;
      
    } catch (error: any) {
      // Handle failed login attempt
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        // Find user profile and increment failed attempts
        const usersCol = collection(this.firestore, 'users');
        const snapshot = await getDocs(usersCol);
        const userDocs = snapshot.docs.filter(doc => doc.data()['email'] === email);
        
        if (userDocs.length > 0) {
          const userData = userDocs[0].data() as UserProfile;
          const currentAttempts = (userData.loginAttempts || 0) + 1;
          
          this.logger.debug(`AuthService failed login attempt ${currentAttempts}/${settings.maxLoginAttempts} for`, email);
          
          const updateData: any = {
            loginAttempts: currentAttempts,
            lastFailedLogin: new Date(),
            updatedAt: new Date()
          };
          
          // Lock account if max attempts reached
          if (currentAttempts >= settings.maxLoginAttempts) {
            const lockDuration = 15; // Lock for 15 minutes
            const lockedUntil = new Date(Date.now() + lockDuration * 60000);
            updateData.lockedUntil = lockedUntil;
            
            this.logger.warn(`AuthService account locked until ${lockedUntil} for`, email);
            await updateDoc(doc(this.firestore, `users/${userData.uid}`), updateData);
            
            throw new Error(`Too many failed login attempts. Account locked for ${lockDuration} minutes.`);
          }
          
          await updateDoc(doc(this.firestore, `users/${userData.uid}`), updateData);
        }
        
        throw new Error('Invalid email or password');
      }
      
      throw error;
    }
  }

  // Sign out
  async signOutUser(redirectTo: string | null = '/client/login'): Promise<void> {
    await signOut(this.auth);
    if (redirectTo !== null) {
      await this.router.navigateByUrl(redirectTo);
    }
  }

  // Create user profile in Firestore
  private async createUserProfile(uid: string, profile: UserProfile): Promise<void> {
    const userDoc = doc(this.firestore, `users/${uid}`);
    await setDoc(userDoc, profile);
  }

  // Get user profile
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const userDoc = doc(this.firestore, `users/${uid}`);
    const docSnap = await getDoc(userDoc);
    if (!docSnap.exists()) return null;
    
    const data = docSnap.data();
    // Convert Firestore Timestamps to JavaScript Dates
    return {
      ...data,
      createdAt: (data['createdAt'] as any)?.toDate ? (data['createdAt'] as any).toDate() : data['createdAt'],
      updatedAt: (data['updatedAt'] as any)?.toDate ? (data['updatedAt'] as any).toDate() : data['updatedAt']
    } as UserProfile;
  }

  // Update user profile
  async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    const userDoc = doc(this.firestore, `users/${uid}`);
    await updateDoc(userDoc, {
      ...data,
      updatedAt: new Date()
    });
  }

  // Check if user is admin
  async isAdmin(uid: string): Promise<boolean> {
    const profile = await this.getUserProfile(uid);
    return profile?.role === 'admin';
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  // Get all users (admin only)
  async getAllUsers(): Promise<UserProfile[]> {
    const usersCol = collection(this.firestore, 'users');
    const q = query(usersCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: (data['createdAt'] as any)?.toDate ? (data['createdAt'] as any).toDate() : data['createdAt'],
        updatedAt: (data['updatedAt'] as any)?.toDate ? (data['updatedAt'] as any).toDate() : data['updatedAt']
      } as UserProfile;
    });
  }

  // Update user role (admin only)
  async updateUserRole(uid: string, role: 'admin' | 'client'): Promise<void> {
    const userDoc = doc(this.firestore, `users/${uid}`);
    await updateDoc(userDoc, {
      role,
      updatedAt: new Date()
    });
  }

  // Update user status (enable/disable) (admin only)
  async updateUserStatus(uid: string, disabled: boolean): Promise<void> {
    const userDoc = doc(this.firestore, `users/${uid}`);
    await updateDoc(userDoc, {
      disabled,
      updatedAt: new Date()
    });
  }

  /**
   * Validate password meets minimum length requirement from settings
   */
  async validatePassword(password: string): Promise<{ valid: boolean; message?: string }> {
    const settings = await this.settingsService.getSettings();
    
    if (password.length < settings.passwordMinLength) {
      return {
        valid: false,
        message: `Password must be at least ${settings.passwordMinLength} characters long`
      };
    }
    
    return { valid: true };
  }

  /**
   * Check if user session is still valid based on session timeout setting
   */
  async isSessionValid(uid: string): Promise<boolean> {
    const settings = await this.settingsService.getSettings();
    
    // If session timeout is 0 or negative, sessions never expire
    if (settings.sessionTimeout <= 0) {
      return true;
    }
    
    const profile = await this.getUserProfile(uid);
    if (!profile || !profile.lastLogin) {
      return false;
    }
    
    const lastLoginTime = profile.lastLogin instanceof Date 
      ? profile.lastLogin.getTime() 
      : (profile.lastLogin as any).toDate().getTime();
    const sessionTimeoutMs = settings.sessionTimeout * 60000; // Convert minutes to ms
    const timeSinceLogin = Date.now() - lastLoginTime;
    
    return timeSinceLogin <= sessionTimeoutMs;
  }

  /**
   * Send new user registration notification email if enabled in settings
   */
  private async sendNewUserNotification(uid: string, email: string, displayName: string): Promise<void> {
    try {
      const settings = await this.settingsService.getSettings();
      
      if (!settings.newUserNotifications) {
        this.logger.debug('AuthService new user notifications disabled, skipping email');
        return;
      }
      
      const recipientEmail = settings.notificationEmail || settings.contactEmail;
      this.logger.debug('AuthService sending new user notification to', recipientEmail);
      
      const emailData = {
        to: recipientEmail,
        subject: this.brandConfig.emails.notifications?.['newUser']?.subject || `🎉 New User Registration - ${this.brandConfig.siteName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">🎉 New User Registration</h2>
            <p>A new user has registered on ${this.brandConfig.siteName}:</p>
            <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Name:</strong> ${displayName}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>User ID:</strong> ${uid}</p>
              <p style="margin: 5px 0;"><strong>Registration Date:</strong> ${new Date().toLocaleString('es-ES')}</p>
            </div>
            <p>You can manage this user from the admin panel.</p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
              This is an automated notification from the ${this.brandConfig.siteName} user management system.
            </p>
          </div>
        `
      };
      
      const result = await this.emailService.queueEmail(emailData);
      if (result.success) {
        this.logger.debug('AuthService new user notification email queued successfully');
      }
    } catch (error) {
      this.logger.error('AuthService error sending new user notification', error);
      // Don't throw - notification failure shouldn't break registration
    }
  }
}
