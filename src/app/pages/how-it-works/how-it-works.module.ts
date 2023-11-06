import { NgModule } from "@angular/core";
import { SharedModule } from "src/app/shared/shared.module";
import { HowItWorksComponent } from "./how-it-works.component";

@NgModule({
    declarations: [
        HowItWorksComponent
    ],
    imports: [
        SharedModule
    ]
})

export class HowItWorksModule {
}