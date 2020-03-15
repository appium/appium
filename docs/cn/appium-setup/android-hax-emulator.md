## Intel® 硬件加速执行管理器

如果你发现你的 android 模拟器运行速度太缓慢，而你的系统又运行在 Intel® 的 cpu 下，你可以试试 HAXM。 HAXM 可以让你利用你的硬件虚拟化技术，为你的模拟器加速。

* 使用 Android SDK Manager 安装 HAXM ，你会在 Extras 文件夹里找到这个包；
* 你可以在 [Intel® 的网站][1] 找到所有相关的文档；
* 这需要 x86 架构的模拟器镜像；
* 使用 Intel 的安装包去安装 HAXM; 根据你已经安装过的版本不同，Android SDK Manager 可能会安装不成功（译者注：如果原来已经有一个旧版本，此时有可能会自动安装失败。建议在 [Intel® 的网站][1] 安装官方安装包手动安装）。

[1]: https://software.intel.com/en-us/articles/intel-hardware-accelerated-execution-manager-intel-haxm


翻译 by [thanksdanny](https://github.com/thanksdanny) ，由 [chenhengjie123](https://github.com/chenhengjie123) 校验
