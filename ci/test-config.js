module.exports = {
  'ios':{
    'mocha-bin': 'ci/mochas/ios71-mocha',
    'glob-patterns': [
      'test/functional/common/**/*-specs.js',
      'test/functional/ios/**/*-specs.js'
    ]
  },
  'android':{
    'mocha-bin': 'ci/mochas/android-mocha',
    'glob-patterns': [
      'test/functional/common/**/*-specs.js',
      'test/functional/android/**/*-specs.js'
    ]
  },
  'gappium':[
    {
      'mocha-bin': 'ci/mochas/ios71-mocha',
      'glob-patterns': [
        'test/functional/gappium/**/*-specs.js'
      ]
    },
    // TODO: gappium/android hangs on sauce.
    // {
    //   'mocha-bin': 'ci/mochas/android-mocha',
    //   'glob-patterns': [
    //     'test/functional/gappium/**/*-specs.js'
    //   ]
    // },
    {
      'mocha-bin': 'ci/mochas/selendroid-mocha',
      'glob-patterns': [
        'test/functional/gappium/**/*-specs.js'
      ]
    }
  ],
  'selendroid':{
    'mocha-bin': 'ci/mochas/selendroid-mocha',
    'glob-patterns': [
      'test/functional/selendroid/**/*-specs.js'
    ]
  }
};
