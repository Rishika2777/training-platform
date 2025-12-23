import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { LoginRequestModel } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly auth = inject(AuthService);

  login(credentials: LoginRequestModel): Observable<unknown> {
    return this.auth.login(credentials);
  }
}


