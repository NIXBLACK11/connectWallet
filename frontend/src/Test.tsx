import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useEffect, useState } from 'react';

const NETWORK = "https://api.devnet.solana.com";
const GAME_WALLET_PUBLIC_KEY = "FhNZ5dafuzZLQXixkvRd2FP4XsDvmPyzaHnQwEtA1mPT";
const DEPOSIT_AMOUNT = 0.3; // 0.5 SOL

export const Test = () => {
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [connection, setConnection] = useState<Connection | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [balance, setBalance] = useState<number | null>(null);

    useEffect(() => {
        const conn = new Connection(NETWORK);
        setConnection(conn);
    }, []);

    useEffect(() => {
        if (walletAddress) {
            fetchBalance();
        }
    }, [walletAddress]);

    const fetchBalance = async () => {
        if (!connection || !walletAddress) return;

        try {
            const publicKey = new PublicKey(walletAddress);
            const balanceInLamports = await connection.getBalance(publicKey);
            const balanceInSOL = balanceInLamports / LAMPORTS_PER_SOL;
            setBalance(balanceInSOL);
        } catch (error) {
            console.error("Error fetching balance:", error);
            setError("Failed to fetch balance. Please try again.");
        }
    };

    const connectWallet = async () => {
        setLoading(true);
        setError(null);
        if (window.solana && window.solana.isPhantom) {
            try {
                await window.solana.disconnect(); // Disconnect first to ensure a fresh connection
                const response = await window.solana.connect();
                setWalletAddress(response.publicKey.toString());
            } catch (error) {
                console.error("Error connecting to Phantom Wallet:", error);
                setError("Failed to connect to Phantom wallet. Please try again.");
            }
        } else {
            setError("Phantom wallet is not installed!");
        }
        setLoading(false);
    };

    const checkBalanceAndDeposit = async () => {
        setLoading(true);
        setError(null);
        if (!connection || !walletAddress) {
            setError("Wallet not connected");
            setLoading(false);
            return;
        }

        try {
            await fetchBalance(); // Refresh balance before checking

            if (balance === null) {
                throw new Error("Failed to fetch balance");
            }

            const requiredBalance = DEPOSIT_AMOUNT;

            console.log(`Current balance: ${balance} SOL`);
            console.log(`Required balance: ${DEPOSIT_AMOUNT} SOL`);

            if (balance < requiredBalance) {
                setError(`Insufficient balance. You have ${balance} SOL, but need at least ${DEPOSIT_AMOUNT} SOL to make this transaction.`);
                setLoading(false);
                return;
            }

            await deposit();
        } catch (error: any) {
            console.error("Error checking balance:", error);
            setError(`Failed to check balance: ${error.message}`);
        }
        setLoading(false);
    };

    const deposit = async () => {
        if (!connection || !walletAddress) {
            setError("Wallet not connected");
            return;
        }
    
        try {
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: new PublicKey(walletAddress),
                    toPubkey: new PublicKey(GAME_WALLET_PUBLIC_KEY),
                    lamports: DEPOSIT_AMOUNT * LAMPORTS_PER_SOL,
                })
            );
    
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = new PublicKey(walletAddress);  // Set the fee payer
    
            // Ensure that Phantom is connected and can sign the transaction
            const signedTransaction = await window.solana?.signTransaction(transaction);
    
            if (!signedTransaction) {
                throw new Error("Failed to sign the transaction");
            }
    
            const signature = await connection.sendRawTransaction(signedTransaction.serialize());
    
            const confirmation = await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight
            });
    
            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`);
            }
    
            console.log("Deposit successful: ", signature);
            await fetchBalance(); // Refresh balance after successful deposit
        } catch (error: any) {
            console.error("Error depositing:", error);
            setError(`Deposit failed: ${error.message}`);
        }
    }
    
    return (
        <div>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {loading && <p>Loading...</p>}
            {!walletAddress ? (
                <button
                    onClick={connectWallet}
                    disabled={loading}
                >Connect Phantom</button>
            ) : (
                <div>
                    <p>Connected: {walletAddress}</p>
                    <p>Balance: {balance !== null ? `${balance} SOL` : 'Loading...'}</p>
                    <button onClick={checkBalanceAndDeposit} disabled={loading}>
                        Deposit {DEPOSIT_AMOUNT} SOL
                    </button>
                </div>
            )}
        </div>
    )
}