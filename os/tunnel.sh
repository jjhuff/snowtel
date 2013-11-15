wget -O /tmp/tunnel_key https://s3.amazonaws.com/temp.mspin.net/tunnel
chmod 600 /tmp/tunnel_key
while true; do
    ssh -o StrictHostKeyChecking=no -nNT -R 2222:localhost:22 -i/tmp/tunnel_key tunnel@tunnel.mspin.net
    sleep 1
done
