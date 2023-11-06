import {animate, animateChild, animation, query, stagger, state, style, transition, trigger, useAnimation} from '@angular/animations';

const customAnimation = animation(
  [
    style({
      opacity: '{{opacity}}',
      transform: 'scale({{scale}}) translate3d({{x}}, {{y}}, {{z}})'
    }),
    animate('{{duration}} {{delay}} cubic-bezier(0.0, 0.0, 0.2, 1)', style('*'))
  ],
  {
    params: {
      duration: '200ms',
      delay: '0ms',
      opacity: '0',
      scale: '1',
      x: '0',
      y: '0',
      z: '0'
    }
  }
);

export const CustomAnimations = [
  trigger('animate', [transition('void => *', [useAnimation(customAnimation)])]),

  trigger('animateStagger', [
    state('50', style('*')),
    state('100', style('*')),
    state('200', style('*')),

    transition('void => 50', query('@*', [stagger('50ms', [animateChild()])], {optional: true})),
    transition('void => 100', query('@*', [stagger('100ms', [animateChild()])], {optional: true})),
    transition('void => 200', query('@*', [stagger('200ms', [animateChild()])], {optional: true}))
  ]),

  trigger("add-to-home-shrink", [ // Note the trigger name
    transition(":enter", [
      // :enter is alias to 'void => *'
      style({ width: "0", height: "25px", overflow: "hidden" }),
      animate(500, style({ height: "*" }))
    ]),
    transition(":leave", [
      // :leave is alias to '* => void'
      animate(500, style({ width: 0, height: "25px", overflow: "hidden" }))
    ])
  ])
];