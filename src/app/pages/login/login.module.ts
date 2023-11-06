import { NgModule } from "@angular/core";
import { AuthModule } from "src/app/shared/components/auth/auth.module";
import { SharedModule } from "src/app/shared/shared.module";
import { LoginComponent } from "./login.component";

@NgModule({
    declarations: [
        LoginComponent
    ],
    imports: [
        SharedModule,
        AuthModule
    ]
})

export class LoginModule {
}