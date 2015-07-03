# [Dashing](https://github.com/stanleyxu2005/dashing)

[![Dependency Status](http://img.shields.io/david/stanleyxu2005/dashing.svg?style=flat)](https://david-dm.org/stanleyxu2005/dashing#info=dependencies)[![DevDependency Status](http://img.shields.io/david/dev/stanleyxu2005/dashing.svg?style=flat)](https://david-dm.org/stanleyxu2005/dashing#info=devDependencies)

Hate searching around the world to find widgets you really love? Dashing is a set of ready-to-use widgets, which helps you to build amazing webapps in minutes! 


## Quick Start

+ Install Dashing with [npm](https://nodejs.org/).

>
```bash
$ npm install
$ gulp
```

+ Include the required libraries in your `index.html`:

>
``` html
<link rel="stylesheet" href="vendors/bootstrap/bootstrap.min.css"/>
<link rel="stylesheet" href="vendors/angular-motion/angular-motion.min.css"/>
<link rel="stylesheet" href="dashing/dashing.min.css"/>
<script src="vendors/angular/angular.min.js"></script>
<script src="vendors/angular-strap/angular-strap.min.js"></script>
<script src="vendors/angular-strap/angular-strap.tpl.min.js"></script>
<script src="vendors/smart-table/smart-table.min.js"></script>
<script src="vendors/echarts/echarts-all.js"></script>
<script src="dashing/dashing.min.js"></script>
```

+ Inject the `dashing` module into your app:

>
``` js
angular.module('myApp', ['dashing']);
```


## Author

**Qian Xu** [github](https://github.com/stanleyxu2005)


## License

The project itself is under Apache License version 2.0. All its dependencies are under diverse open source licences. Please checkout their homepage for more details.

+ [AngularJS](http://angularjs.org)
+ [Boostrap 3](http://getbootstrap.com)
+ [Angular-Strap](http://mgcrea.github.io/angular-strap)
+ [Smart-Table](http://lorenzofox3.github.io/smart-table-website/)
+ [Baidu Echarts](http://echarts.baidu.com/)
