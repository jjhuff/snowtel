#include <stdlib.h>
#include <stdio.h>
#include <avr/io.h>
#include <avr/interrupt.h>
#include <avr/pgmspace.h>
#include <avr/wdt.h>
#include <util/delay.h>

#include "i2cmaster.h"

#define BAUD 9600

#define sbi(var, mask)   ((var) |= (uint8_t)(1 << mask))
#define cbi(var, mask)   ((var) &= (uint8_t)~(1 << mask))

///============Function Prototypes=========/////////////////
void MLX(void);

///============Initialize Prototypes=====//////////////////
void ioinit(void);
void UART_Init(unsigned int ubrr);
int uart_putchar(char c, FILE *stream);
int uart_getchar(FILE *stream);
char uart_haschar(void);

FILE uart = FDEV_SETUP_STREAM(uart_putchar, uart_getchar, _FDEV_SETUP_RW);

uint16_t sonar_pulse_len;
uint16_t sonar_pulse_start;

/////===================================////////////////////

static const uint8_t PROGMEM CRC8[256] =
{
    0x00U, 0x07U, 0x0EU, 0x09U, 0x1CU, 0x1BU, 0x12U, 0x15U,
    0x38U, 0x3FU, 0x36U, 0x31U, 0x24U, 0x23U, 0x2AU, 0x2DU,
    0x70U, 0x77U, 0x7EU, 0x79U, 0x6CU, 0x6BU, 0x62U, 0x65U,
    0x48U, 0x4FU, 0x46U, 0x41U, 0x54U, 0x53U, 0x5AU, 0x5DU,
    0xE0U, 0xE7U, 0xEEU, 0xE9U, 0xFCU, 0xFBU, 0xF2U, 0xF5U,
    0xD8U, 0xDFU, 0xD6U, 0xD1U, 0xC4U, 0xC3U, 0xCAU, 0xCDU,
    0x90U, 0x97U, 0x9EU, 0x99U, 0x8CU, 0x8BU, 0x82U, 0x85U,
    0xA8U, 0xAFU, 0xA6U, 0xA1U, 0xB4U, 0xB3U, 0xBAU, 0xBDU,
    0xC7U, 0xC0U, 0xC9U, 0xCEU, 0xDBU, 0xDCU, 0xD5U, 0xD2U,
    0xFFU, 0xF8U, 0xF1U, 0xF6U, 0xE3U, 0xE4U, 0xEDU, 0xEAU,
    0xB7U, 0xB0U, 0xB9U, 0xBEU, 0xABU, 0xACU, 0xA5U, 0xA2U,
    0x8FU, 0x88U, 0x81U, 0x86U, 0x93U, 0x94U, 0x9DU, 0x9AU,
    0x27U, 0x20U, 0x29U, 0x2EU, 0x3BU, 0x3CU, 0x35U, 0x32U,
    0x1FU, 0x18U, 0x11U, 0x16U, 0x03U, 0x04U, 0x0DU, 0x0AU,
    0x57U, 0x50U, 0x59U, 0x5EU, 0x4BU, 0x4CU, 0x45U, 0x42U,
    0x6FU, 0x68U, 0x61U, 0x66U, 0x73U, 0x74U, 0x7DU, 0x7AU,
    0x89U, 0x8EU, 0x87U, 0x80U, 0x95U, 0x92U, 0x9BU, 0x9CU,
    0xB1U, 0xB6U, 0xBFU, 0xB8U, 0xADU, 0xAAU, 0xA3U, 0xA4U,
    0xF9U, 0xFEU, 0xF7U, 0xF0U, 0xE5U, 0xE2U, 0xEBU, 0xECU,
    0xC1U, 0xC6U, 0xCFU, 0xC8U, 0xDDU, 0xDAU, 0xD3U, 0xD4U,
    0x69U, 0x6EU, 0x67U, 0x60U, 0x75U, 0x72U, 0x7BU, 0x7CU,
    0x51U, 0x56U, 0x5FU, 0x58U, 0x4DU, 0x4AU, 0x43U, 0x44U,
    0x19U, 0x1EU, 0x17U, 0x10U, 0x05U, 0x02U, 0x0BU, 0x0CU,
    0x21U, 0x26U, 0x2FU, 0x28U, 0x3DU, 0x3AU, 0x33U, 0x34U,
    0x4EU, 0x49U, 0x40U, 0x47U, 0x52U, 0x55U, 0x5CU, 0x5BU,
    0x76U, 0x71U, 0x78U, 0x7FU, 0x6AU, 0x6DU, 0x64U, 0x63U,
    0x3EU, 0x39U, 0x30U, 0x37U, 0x22U, 0x25U, 0x2CU, 0x2BU,
    0x06U, 0x01U, 0x08U, 0x0FU, 0x1AU, 0x1DU, 0x14U, 0x13U,
    0xAEU, 0xA9U, 0xA0U, 0xA7U, 0xB2U, 0xB5U, 0xBCU, 0xBBU,
    0x96U, 0x91U, 0x98U, 0x9FU, 0x8AU, 0x8DU, 0x84U, 0x83U,
    0xDEU, 0xD9U, 0xD0U, 0xD7U, 0xC2U, 0xC5U, 0xCCU, 0xCBU,
    0xE6U, 0xE1U, 0xE8U, 0xEFU, 0xFAU, 0xFDU, 0xF4U, 0xF3U
};

uint8_t crc8(uint8_t crc, uint8_t pec)
{
    return pgm_read_byte(&(CRC8[crc ^ pec]));
}

#define MLX_ADDR 0x00
#define MLX_OBJECT     0x07 // RAM address 0x07, object temperature 1
#define MLX_AMBIENT    0x06 // RAM address 0x06, ambient temperature
#define MLX_EMISSIVITY 0x24 // EEPROM Emissivity constant
#define MLX_SLEEP      0xFF // Go into sleep mode

uint16_t mlx_read(uint8_t reg)
{
    //Slave Address (SA) can be 0x00 for any MLX90614
    //using Read Word: SA(write) - Command - SA(read) - LSByte - MSByte - PEC
    i2c_start_wait( MLX_ADDR + I2C_WRITE);

    i2c_write(reg);

    i2c_rep_start( MLX_ADDR + I2C_READ);

    uint8_t xl = i2c_readAck();    //low byte
    uint8_t xh = i2c_readAck();    //high byte

    i2c_readNak(); // pec
    i2c_stop();

    return (xh << 8)|xl; //concatinate MSB and LSB
}

double mlx_read_temp(uint8_t sensor)
{
    uint16_t reg = mlx_read(sensor);

    if(reg & 0x8000) //if MSbit is 1 there is an error
    {
        return -100;
    } else {
        //return (((long)reg * (3.6)) - 45967)/100; //temp F
        return ((long)reg/50.0) - 273.15; //temp C
    }
}


void mlx_write(uint8_t reg, uint16_t val)
{
    uint8_t pec = 0;

    //Slave Address (SA) can be 0x00 for any MLX90614
    i2c_start_wait( MLX_ADDR + I2C_WRITE);
    pec = crc8(pec, MLX_ADDR + I2C_WRITE);

    i2c_write(reg);
    pec = crc8(pec, reg);

    i2c_write(val&0xFF);
    pec = crc8(pec, val&0xFF);

    i2c_write(val>>8);
    pec = crc8(pec, val>>8);

    i2c_write(pec); //pec

    i2c_stop();

}

void mlx_reset(void)
{
    // Go to sleep
    uint8_t pec = 0;
    i2c_start_wait( MLX_ADDR + I2C_WRITE);
    pec = crc8(pec, MLX_ADDR + I2C_WRITE);

    i2c_write(MLX_SLEEP);
    pec = crc8(pec, MLX_SLEEP);

    i2c_write(pec); //pec

    i2c_stop();
    _delay_ms(100);

    // Bring out of sleep
    TWCR = 0; //disable TWI
    DDRC = DDRC | (1<<4) | (1<<5); //SDA/SCL outputs

    PORTC = PORTC & ~(1<<5); //SCL low
    PORTC = PORTC | (1<<4); //SDA high

    _delay_ms(5);
    PORTC = PORTC | 1<<5; //SCL high

    PORTC = PORTC & ~(1<<4); //SDA low
    _delay_ms(30);
    PORTC = PORTC | (1<<4); //SDA high

    _delay_ms(100);
}

void mlx_set_emissivity(double val)
{
    mlx_write(MLX_EMISSIVITY, 0);
    _delay_ms(100);
    mlx_write(MLX_EMISSIVITY, 65535*val);
    _delay_ms(100);
    // reset the device
    mlx_reset();
}

ISR(TIMER1_CAPT_vect)
{
    uint16_t icr = ICR1;
    uint8_t tccr1b = TCCR1B;

    // Toggle the capture edge
    TCCR1B = tccr1b ^ (1 << ICES1);

    if (tccr1b & (1 << ICES1))
    {
        // we caught the rising edge
        sonar_pulse_start = icr;
        TIFR1 |= (1<<TOV1); // clear the overflow flag
    }
    else
    {
        // we caught the falling edge
        // if we overflowed, ignore the result
        if (TIFR1 & (1<<TOV1) ) {
            sonar_pulse_len = 0;
        } else  {
            sonar_pulse_len = (icr - sonar_pulse_start)>>1;
        }
    }

    return;
}


#define MODE_READ_TEMP          't'
#define MODE_READ_TEMP_CONT     'T'
#define MODE_READ_EMISSIVITY    'e'
#define MODE_SET_EMISSIVITY     'E'
#define MODE_READ_DIST          'd'
#define MODE_READ_DIST_CONT     'D'
#define MODE_UPGRADE            'u'

void my_gets(char* buf)
{
    char c;
    while(1)
    {
        c = getchar();
        if (c == ' ' || c == '\r' || c == '\n')
            break;
        else
            *(buf++) = c;
    }
}

int main(void)
{
    ioinit();
    i2c_init();
    _delay_ms(1000);

    sei();

    puts("READY\n");
    wdt_enable(WDTO_8S);
    char mode = 0;
    double d;
    char buf[16];
    while(1)
    {
        wdt_reset();
        if (uart_haschar())
        {
            mode = getchar();
        }

        switch(mode)
        {
            case MODE_READ_TEMP:
                mode = 0;
            case MODE_READ_TEMP_CONT:
                d = mlx_read_temp(MLX_OBJECT);
                printf("%.2f ", d);
                d = mlx_read_temp(MLX_AMBIENT);
                printf("%.2f\n", d);
                break;

            case MODE_READ_DIST:
                mode = 0;
            case MODE_READ_DIST_CONT:
                printf("%d ", sonar_pulse_len);
                d = sonar_pulse_len/58.0;
                printf("%.1f\n", d);
                break;

            case MODE_SET_EMISSIVITY:
                mode = 0;
                my_gets(buf);
                d = atof(buf);
                mlx_set_emissivity(d);
                puts("SET\n");
                break;

            case MODE_READ_EMISSIVITY:
                mode = 0;
                uint16_t Ke = mlx_read(MLX_EMISSIVITY);
                d = Ke/65535.0;
                printf("%.2f\n", d);
                break;
            case MODE_UPGRADE:
                wdt_enable(WDTO_1S);
                while(1); //Wait for WTD to timeout
                break;
            default:
                mode = 0;
        }
        if (mode != 0)
            _delay_ms(100);
    }
}

/*********************
 ****Initialize****
 *********************/

void ioinit (void)
{
    //1 = output, 0 = input
    DDRB = 0b00000010;
    //PORTB |= 1<<0; // PB0 pullup
    //DDRC = 0b00010000; //PORTC4 (SDA), PORTC5 (SCL), PORTC all others are inputs
    DDRD = 0b11111110; //PORTD (RX on PD0), PD2 is status output
    //PORTC = 0b00110000; //pullups on the I2C bus

    UART_Init((unsigned int)(F_CPU/16/(BAUD)-1));        // ocillator fq/16/baud rate -1

    TCCR1A = 0x00;
    TCCR1B = (1<<ICES1) | (1<<CS11); // Prescaler = Fcpu/8
    OCR1A  = 0;
    TIMSK1 |= (1 << ICIE1);

}

void UART_Init( unsigned int ubrr)
{
    // Set baud rate
    UBRR0H = ubrr>>8;
    UBRR0L = ubrr;

    // Enable receiver and transmitter
    UCSR0A = (0<<U2X0);
    UCSR0B = (1<<RXEN0)|(1<<TXEN0);

    // Set frame format: 8 bit, no parity, 1 stop bit,
    UCSR0C = (1<<UCSZ00)|(1<<UCSZ01);

    stdout = &uart;
    stdin = &uart;
}

int uart_putchar(char c, FILE *stream)
{
    if (c == '\n') uart_putchar('\r', stream);

    loop_until_bit_is_set(UCSR0A, UDRE0);
    UDR0 = c;

    return 0;
}

int uart_getchar(FILE *stream)
{
    loop_until_bit_is_set(UCSR0A, RXC0); /* Wait until data exists. */
    return UDR0;
}

char uart_haschar(void)
{
    return (UCSR0A & 1<<RXC0) > 0;
}
