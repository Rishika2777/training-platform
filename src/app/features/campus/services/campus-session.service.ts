import { Injectable, inject, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';

/**
 * Campus Session Service
 * Tracks user activity in campus section
 * - Tracks user activity (mouse, keyboard, clicks)
 * - Only active when user is on campus routes
 */
@Injectable({ providedIn: 'root' })
export class CampusSessionService implements OnDestroy {
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  
  private activityCheckInterval: ReturnType<typeof setInterval> | null = null;
  private lastActivityTime = Date.now();
  private routerSubscription: Subscription | null = null;
  private isActive = false;
  
  // Activity tracking event listeners
  private activityListeners: (() => void)[] = [];
  
  // Activity check interval: check every 5 minutes
  private readonly ACTIVITY_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  // Activity timeout: consider user inactive after 2 minutes of no activity
  private readonly ACTIVITY_TIMEOUT = 2 * 60 * 1000; // 2 minutes

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initialize();
    }
  }

  private initialize(): void {
    // Monitor route changes to start/stop session management
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = (event as NavigationEnd).url;
        const isCampusRoute = url.startsWith('/campus');
        
        if (isCampusRoute && !this.isActive) {
          this.start();
        } else if (!isCampusRoute && this.isActive) {
          this.stop();
        }
      });
    
    // Check if already on campus route
    if (this.router.url.startsWith('/campus')) {
      this.start();
    }
  }

  /**
   * Start session management for campus section
   */
  start(): void {
    if (this.isActive) {
      return;
    }
    
    console.log('CampusSessionService: Starting session management');
    this.isActive = true;
    this.lastActivityTime = Date.now();
    
    // Set up activity tracking
    this.setupActivityTracking();
    
    // Start activity check interval
    this.startActivityCheck();
  }

  /**
   * Stop session management
   */
  stop(): void {
    if (!this.isActive) {
      return;
    }
    
    console.log('CampusSessionService: Stopping session management');
    this.isActive = false;
    
    // Remove activity listeners
    this.removeActivityTracking();
    
    // Clear intervals
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }
  }

  /**
   * Set up activity tracking (mouse, keyboard, clicks)
   */
  private setupActivityTracking(): void {
    const updateActivity = () => {
      this.lastActivityTime = Date.now();
    };
    
    // Track mouse movement
    const mouseMoveListener = () => updateActivity();
    document.addEventListener('mousemove', mouseMoveListener, { passive: true });
    this.activityListeners.push(() => document.removeEventListener('mousemove', mouseMoveListener));
    
    // Track mouse clicks
    const clickListener = () => updateActivity();
    document.addEventListener('click', clickListener, { passive: true });
    this.activityListeners.push(() => document.removeEventListener('click', clickListener));
    
    // Track keyboard input
    const keydownListener = () => updateActivity();
    document.addEventListener('keydown', keydownListener, { passive: true });
    this.activityListeners.push(() => document.removeEventListener('keydown', keydownListener));
    
    // Track scroll
    const scrollListener = () => updateActivity();
    document.addEventListener('scroll', scrollListener, { passive: true });
    this.activityListeners.push(() => document.removeEventListener('scroll', scrollListener));
    
    // Track touch events (for mobile)
    const touchStartListener = () => updateActivity();
    document.addEventListener('touchstart', touchStartListener, { passive: true });
    this.activityListeners.push(() => document.removeEventListener('touchstart', touchStartListener));
  }

  /**
   * Remove activity tracking listeners
   */
  private removeActivityTracking(): void {
    this.activityListeners.forEach(remove => remove());
    this.activityListeners = [];
  }

  /**
   * Start activity check to ensure user is still active
   */
  private startActivityCheck(): void {
    // Clear existing interval if any
    if (this.activityCheckInterval) {
      clearInterval(this.activityCheckInterval);
    }
    
    // Check activity periodically
    this.activityCheckInterval = setInterval(() => {
      if (this.isActive) {
        const timeSinceLastActivity = Date.now() - this.lastActivityTime;
        
        // Track user activity
        if (timeSinceLastActivity > this.ACTIVITY_TIMEOUT) {
          console.log('CampusSessionService: User inactive');
        } else {
          console.log('CampusSessionService: User is active');
        }
      }
    }, this.ACTIVITY_CHECK_INTERVAL);
  }

  ngOnDestroy(): void {
    this.stop();
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    
  }
}


