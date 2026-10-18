// Document-store commands. Our own classes with an explicit `type`, because the store dispatches on it and
// bundlers minify class names (and may duplicate the AWS SDK classes), so neither name nor instanceof is reliable.
const command = (type) => class { constructor(input) { this.input = input; this.type = type; } };
export const PutCommand = command('PutCommand');
export const GetCommand = command('GetCommand');
export const UpdateCommand = command('UpdateCommand');
export const DeleteCommand = command('DeleteCommand');
export const ScanCommand = command('ScanCommand');
export const QueryCommand = command('QueryCommand');
