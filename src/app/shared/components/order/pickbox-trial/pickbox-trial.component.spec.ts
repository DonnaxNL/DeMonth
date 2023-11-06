import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PickboxTrialComponent } from './pickbox-trial.component';

describe('PickboxTrialComponent', () => {
  let component: PickboxTrialComponent;
  let fixture: ComponentFixture<PickboxTrialComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PickboxTrialComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PickboxTrialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
