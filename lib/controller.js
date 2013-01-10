//controller methods

exports.blah = function(req, res)  {
  res.writeHead(200);
  res.end('hello '+req.params.base);
};
