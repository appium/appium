#	Copyright 2012 Appium Committers
#
#	Licensed to the Apache Software Foundation (ASF) under one
#	or more contributor license agreements.  See the NOTICE file
#	distributed with this work for additional information
#	regarding copyright ownership.  The ASF licenses this file
#	to you under the Apache License, Version 2.0 (the
#	"License"); you may not use this file except in compliance
#	with the License.  You may obtain a copy of the License at
#
#	http://www.apache.org/licenses/LICENSE-2.0
#
#	Unless required by applicable law or agreed to in writing,
#	software distributed under the License is distributed on an
#	"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
#	KIND, either express or implied.  See the License for the
#	specific language governing permissions and limitations
#	under the License.

import re
import shutil
import tempfile
import difflib

# read the contents of /etc/authorization
with open('/etc/authorization','r') as file:
	content = file.read()
match = re.search('<key>system.privilege.taskport</key>\s*\n\s*<dict>\n\s*<key>allow-root</key>\n\s*(<[^>]+>)',content)
if match is None:
	raise Exception('Could not find the system.privilege.taskport key in /etc/authorization')
elif re.search('<false/>', match.group(0)) is None:
	print '/etc/authorization has already been modified to support appium'
	exit(0)
new_text = match.group(0).replace(match.group(1), '<true/>')
new_content = content.replace(match.group(0), new_text)

# backup /etc/authorization
backupFile = tempfile.mkstemp('.backup','authorization')[1]
shutil.copy('/etc/authorization', backupFile)
print 'backed up /etc/authorization to %s...' % backupFile

# present diff to the user
diff = difflib.context_diff(content.splitlines(), new_content.splitlines())
print '\n'.join(diff)
answer = raw_input('Write changes (y/n)')

if answer.lower()[0] == 'y':
	# write back the modified permissions
	with open('/etc/authorization','w') as file:
		file.write(new_content)
		print 'wrote new /etc/authorization'
else:
	print 'No changes were made.'

