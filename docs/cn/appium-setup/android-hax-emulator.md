## Intel® 硬件加速执行管理器

如果你发现你的 android 模拟器运行速度太缓慢，而你的系统又运行在 Intel® 的 cpu 下，你可以试试 HAXM。 HAXM 可以让你利用你的硬件虚拟化技术使你的模拟器加速。

* 打开 Android SDK Manager 找到 HAXM 进行安装，你会在 Extras 文件夹里找到这个包；
* 你可以在 [Intel® 的网站][1] 找到所有相关的文档；
* 需要 x86 架构的模拟器镜像；
* 如果使用 Intel 的包去安装 HAXM， Android SDK Manager 可能会显示安装不成功，可能依赖的版本你已经安装了；

[1]: http://software.intel.com/en-us/articles/intel-hardware-accelerated-execution-manager/
