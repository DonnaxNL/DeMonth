import { NgModule } from "@angular/core";
import { SharedModule } from "src/app/shared/shared.module";
import { TermsPolicyComponent } from "./terms-policy.component";

@NgModule({
    declarations: [
        TermsPolicyComponent
    ],
    imports: [
        SharedModule
    ]
})

export class TermsPolicyModule {
}