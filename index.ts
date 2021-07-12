import * as crypto from 'crypto';

class Transaction {
    constructor(
        public amount: number,
        public payer: string, // public key
        public payee: string // public key
    ) { }
}

class Block {
    public nonce = Math.round(Math.random() * 999_999_999);

    constructor(
        public prevHash: string,
        public transaction: Transaction,
        public ts = Date.now() // timestamp
    ) { }

    get hash() {
        const str = JSON.stringify(this);
        const hash = crypto.createHash('SHA256');
        hash.update(str).end();
        return hash.digest('hex');
    }
}

class Chain {
    public static instance = new Chain();

    chain: Block[];
    
    constructor() {
        this.chain = [new Block('', new Transaction(100, 'genesis', 'satoshi'))]
    }

    get lastBlock() {
        return this.chain[this.chain.length-1];
    }

    mine(nonce: number) {
        let solution = 1; // iterate through numbers
        console.log('mining...');
        while (true) {
            const hash = crypto.createHash('MD5');
            hash.update((nonce + solution).toString()).end();

            // hash of nonce + our number starts with 0000
            const attempt = hash.digest('hex');
            if (attempt.substr(0,4) === '0000') {
                console.log(`solved: ${solution}`);
                return solution;
            }

            solution++;
        }
    }

    addBlock(transaction: Transaction, senderPublicKey: string, signature: Buffer) {
        const verifier = crypto.createVerify('SHA256');
        verifier.update(transaction.toString());

        const isValid = verifier.verify(senderPublicKey, signature);

        if (isValid) {
            const newBlock = new Block(this.lastBlock.hash, transaction);
            this.mine(newBlock.nonce)
            this.chain.push(newBlock);
        }
    }
}

class Wallet {
    public publicKey: string;
    public privateKey: string;
    public balance: number;
    
    constructor() {
        const keypair = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });

        this.privateKey = keypair.privateKey;
        this.publicKey = keypair.publicKey;
        this.balance = 50;
    }

    sendMoney(amount: number, payee: Wallet) {
        if (amount > this.balance) {
            return console.log(`unable to process transaction: Amount=${amount}, Balance=${this.balance}`);
        }
        
        const transaction = new Transaction(amount, this.publicKey, payee.publicKey);
        
        const sign = crypto.createSign('SHA256');
        sign.update(transaction.toString()).end();
        
        const signature = sign.sign(this.privateKey);
        Chain.instance.addBlock(transaction, this.publicKey, signature);
        
        this.balance -= amount;
        payee.balance += amount;
        console.log(`transaction complete: Payer=${this.balance}, Payee=${payee.balance}`);
    }
}

const bob = new Wallet();
const alice = new Wallet();
const john = new Wallet();

bob.sendMoney(50, alice);
console.log('================================================================');
john.sendMoney(30, bob);
console.log('================================================================');
alice.sendMoney(40, john);
console.log('================================================================');
bob.sendMoney(50, alice);
console.log('================================================================');

console.log(`Bob: ${bob.balance}\nAlice: ${alice.balance}\nJohn: ${john.balance}`);