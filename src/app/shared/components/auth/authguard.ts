import { Inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthProcessService } from 'src/app/services/auth-service';

@Injectable({
    providedIn: 'root'
})
export class LoggedInGuard implements CanActivate {
    constructor(
        private router: Router,
        private authProcess: AuthProcessService
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        return this.authProcess.afa.user.pipe(
            map(user => {
                //console.log('auth', user)
                if (user) {
                    return true;
                } else {
                    //   if (this.config.authGuardFallbackURL) {
                    this.router.navigate([`/login`], { queryParams: { redirectUrl: state.url } });
                    //   }
                    return false;
                }
            })
        );
    }
}