# Intel® 硬件加速器管理

如果你发现android模拟器太慢, 并且你的系统运行在Intel® 的cpu上. 那么你可以尝试下HAXM, HAXM能够让你充分利用硬件虚拟化技术来加速android模拟器。

* 要安装HAXM, 你可以打开Android SDK Manager, 你可以在Extras中发现这个安装选项；
* 你可以在[Intel官方网站][1]找到所有相关的文档；
* 这将需要x86的模拟镜像；
* 利用Intel的包来安装HAXM; Android SDK Manager有时候会安装不成功，这主要取决于你安装的版本是否兼容。

[1]: http://software.intel.com/en-us/articles/intel-hardware-accelerated-execution-manager/ "Hax" 
[2]: http://software.intel.com/en-us/search/site/language/en?query=Intel%20Hardware%20Accelerated%20Execution%20Manager%20%28HAXM%29 "Hax all"
