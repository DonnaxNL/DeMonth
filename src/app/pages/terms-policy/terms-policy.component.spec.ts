import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { AppModule } from 'src/app/app.module';

import { TermsPolicyComponent } from './terms-policy.component';

describe('TermsPolicyComponent', () => {
  let component: TermsPolicyComponent;
  let fixture: ComponentFixture<TermsPolicyComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ AppModule ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TermsPolicyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('#changePage', () => {
    component.changePage('terms');
    expect(component.menuSelected).toBe('terms', 'Terms Page');
    component.changePage('privacy');
    expect(component.menuSelected).toBe('privacy', 'Privacy Policy');
    component.changePage('cookie');
    expect(component.menuSelected).toBe('cookie', 'Cookie Policy');
  });
});
