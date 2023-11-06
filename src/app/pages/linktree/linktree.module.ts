import { NgModule } from "@angular/core";
import { SharedModule } from "src/app/shared/shared.module";
import { LinktreeComponent } from "./linktree.component";

@NgModule({
    declarations: [
        LinktreeComponent
    ],
    imports: [
        SharedModule
    ]
})

export class LinktreeModule {
}