import { NgModule } from "@angular/core";
import { SharedModule } from "src/app/shared/shared.module";
import { TrialBoxComponent } from "./trial-box.component";

@NgModule({
    declarations: [
        TrialBoxComponent
    ],
    imports: [
        SharedModule
    ]
})

export class TrialBoxModule {
}