import { NgModule } from "@angular/core";
import { SharedModule } from "src/app/shared/shared.module";
import { ClosedComponent } from "./closed.component";

@NgModule({
    declarations: [
        ClosedComponent
    ],
    imports: [
        SharedModule
    ]
})

export class ClosedModule {
}