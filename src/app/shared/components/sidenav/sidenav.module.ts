import { NgModule } from "@angular/core";
import { SharedModule } from "../../shared.module";
import { SideNavComponent } from "./sidenav.component";

@NgModule({
    declarations: [
        SideNavComponent
    ],
    imports: [
        SharedModule
    ],
    exports: [
        SideNavComponent
    ]
})

export class SideNavModule {
}