---
title: 贡献代码
---

要为Appium代码库做出贡献，请务必查看Git存储库。

!!! 信息

    如果您是VS Code用户，您可以使用[Runme](https://runme.dev/api/runme?repository=https%3A%2F%2Fgithub.com%2Fappium%2Fappium.git&fileToOpen=packages%2Fappium%2Fdocs%2Fen%2Fcontributing%2Findex.md)轻松查看项目。

建议在将其克隆到您的系统之前进行[fork](https://github.com/appium/appium/fork)。

```sh
export GITHUB_USERNAME=<your-username>
git clone git@github.com:$GITHUB_USERNAME/appium.git
```

克隆后，您可以继续安装项目依赖项：

```sh
npm install
```

从现在开始，你可以做几件事。

### 监视文件

在开发Appium代码时，我们必须查看所有JavaScript和TypeScript文件，以便在每次更改后重新编译它们。您可以通过以下方式运行此监视过程：

```sh
npm run dev
```

### 在开发模式下启动Appium

要测试您的更改，您可以通过以下方式在开发模式下运行Appium：

```sh
npm start
```

### 运行测试

该项目维护了一组不同的测试变体，您可以运行这些变体来验证代码的质量。

#### 代码风格检查

Appium使用[`eslint`](https://eslint.org/)进行静态代码分析和代码风格检查。你可以通过以下方式运行这些检查：

```sh
npm run lint
```

#### 单元测试

```sh
npm run test:unit
```

您还可以对特定工作区运行测试，例如：

```sh
export APPIUM_WORKSPACE=@appium/doctor
npm run test:unit -w $APPIUM_WORKSPACE
```

#### 冒烟和端到端测试

```sh 
npm run test:slow
```

### 在本地部署文档

我们的文档系统使用[MKDocs](https://www.mkdocs.org/)，因此需要在您的系统上安装[Python](https://www.python.org/)。您可以通过以下方式运行文档：

```sh
# 安装所需的Python依赖项
PIP_BREAK_SYSTEM_PACKAGES=1 pip install -r packages/docutils/requirements.txt
# 构建项目
npm run build
# 运行开发服务器
npm run dev:docs
```

您应该可以在`http://127.0.0.1:8000/docs/en`查看页面：

```sh
open http://127.0.0.1:8000/docs/en
```
