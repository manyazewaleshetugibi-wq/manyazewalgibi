// types/crypto-js.d.ts
declare module 'crypto-js' {
    export interface WordArray {
        toString(): string;
        toString(encoder: Encoder): string;
        words: number[];
        sigBytes: number;
    }

    export interface Encoder {
        parse(str: string): WordArray;
        stringify(wordArray: WordArray): string;
    }

    export interface Hash {
        (message: string | WordArray, cfg?: object): WordArray;
        toString(): string;
        toString(encoder: Encoder): string;
    }

    export interface Cipher {
        toString(): string;
        toString(encoder: Encoder): string;
    }

    export interface CipherParams {
        ciphertext: WordArray;
        salt?: WordArray;
        iv?: WordArray;
        key?: WordArray;
        algorithm?: string;
        mode?: string;
        padding?: string;
        blockSize?: number;
        formatter?: Format;
        toString(): string;
        toString(encoder: Encoder): string;
    }

    export interface Format {
        stringify(cipherParams: CipherParams): string;
        parse(str: string): CipherParams;
    }

    export interface CipherStatic {
        encrypt(message: string, password: string, options?: any): Cipher;
        decrypt(ciphertext: string, password: string, options?: any): WordArray;
        createEncryptor(key: WordArray | string, options?: any): any;
        createDecryptor(key: WordArray | string, options?: any): any;
    }

    export interface KDF {
        execute(password: string, keySize: number, options: any): any;
    }

    const CryptoJS: {
        AES: CipherStatic;
        DES: CipherStatic;
        TripleDES: CipherStatic;
        Rabbit: CipherStatic;
        RC4: CipherStatic;
        RC4Drop: CipherStatic;
        
        enc: {
            Hex: Encoder;
            Latin1: Encoder;
            Utf8: Encoder;
            Utf16: Encoder;
            Base64: Encoder;
        };
        
        mode: {
            CBC: any;
            CFB: any;
            CTR: any;
            OFB: any;
            ECB: any;
        };
        
        pad: {
            Pkcs7: any;
            AnsiX923: any;
            Iso10126: any;
            Iso97971: any;
            ZeroPadding: any;
            NoPadding: any;
        };
        
        format: {
            OpenSSL: Format;
        };
        
        kdf: {
            OpenSSL: KDF;
        };
        
        algo: {
            AES: any;
            DES: any;
            TripleDES: any;
            Rabbit: any;
            RC4: any;
            RC4Drop: any;
        };
        
        lib: {
            WordArray: WordArray;
            CipherParams: CipherParams;
        };
        
        MD5: Hash;
        SHA1: Hash;
        SHA256: Hash;
        SHA224: Hash;
        SHA512: Hash;
        SHA384: Hash;
        SHA3: Hash;
        RIPEMD160: Hash;
        
        HmacMD5: any;
        HmacSHA1: any;
        HmacSHA256: any;
        HmacSHA224: any;
        HmacSHA512: any;
        HmacSHA384: any;
        HmacSHA3: any;
        HmacRIPEMD160: any;
        
        PBKDF2: any;
        
        EvpKDF: any;
        
        WordArray: {
            create(words?: number[], sigBytes?: number): WordArray;
            random(nBytes: number): WordArray;
        };
    };

    export default CryptoJS;
}